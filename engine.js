/* Pure game rules, shared by the browser and the verification script. */
(function (root) {
  'use strict';
  const referenceTools=root.EsgrimaReferences||(typeof require==='function'?require('./references.js'):null);
  function parseReferences(value) { return referenceTools.parseList(value); }
  function randomInt(max) {
    if (root.crypto && root.crypto.getRandomValues) {
      const range = 4294967296, limit = range - range % max, data = new Uint32Array(1);
      do { root.crypto.getRandomValues(data); } while (data[0] >= limit);
      return data[0] % max;
    }
    return Math.floor(Math.random() * max);
  }
  function createDeck(refs, count, pick = randomInt) {
    if (!Number.isInteger(count) || count < 1 || count > refs.length) throw new Error('Elige una cantidad entre 1 y ' + refs.length + '.');
    const deck = refs.slice();
    for (let i = deck.length - 1; i > 0; i--) { const j = pick(i + 1); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    return deck.slice(0, count);
  }
  function parsePlayers(value) {
    const names = value.split(/\n/).map(name => name.trim().replace(/\s+/g, ' ')).filter(Boolean);
    const seen = new Set(), duplicates = [];
    for (const name of names) {
      const key = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      if (seen.has(key)) duplicates.push(name);
      seen.add(key);
    }
    return { names, duplicates };
  }
  const VERSES_PER_MATCH = 3;
  function tournamentSize(count) {
    if (!Number.isInteger(count) || count < 2 || count > 128) throw new Error('El torneo necesita entre 2 y 128 participantes.');
    let matches = 0, rounds = 0, triples = 0, finalists = 0, previousCount = 0;
    while (count > 1) {
      if (count % 2) triples++;
      if (count <= 3) finalists = count;
      if (Math.floor(count / 2) === 2) previousCount = count;
      count = Math.floor(count / 2);
      matches += count; rounds++;
    }
    const medalPlayers = finalists === 3 ? 2 : previousCount ? previousCount - 2 : 0;
    const medalMatches = medalPlayers ? 1 : 0;
    matches += medalMatches;
    if (medalPlayers === 3) triples++;
    return { matches, rounds, triples, medalPlayers, medalMatches, verses: matches * VERSES_PER_MATCH + triples, regulationVerses: matches * VERSES_PER_MATCH, suddenDeathReserve: triples, minimumVerses: matches * 2 };
  }
  function createTournament(names, pick = randomInt) {
    tournamentSize(names.length);
    if (names.some(name => typeof name !== 'string' || !name.trim()) || parsePlayers(names.join('\n')).duplicates.length) throw new Error('Cada participante necesita un nombre distinto.');
    const players = names.map((name, index) => ({ id: 'p' + (index + 1), name }));
    let sources = createDeck(players, players.length, pick).map(player => ({ player: player.id }));
    const rounds = [], matches = [];
    while (sources.length > 1) {
      const round = [];
      for (let offset = 0; offset < sources.length;) {
        const groupSize = sources.length - offset === 3 ? 3 : 2;
        const match = { id: 'm' + (matches.length + 1), sequence: matches.length, round: rounds.length, sources: sources.slice(offset, offset + groupSize), winner: null, results: [] };
        offset += groupSize; round.push(match); matches.push(match);
      }
      rounds.push(round);
      sources = round.map(match => ({ match: match.id }));
    }
    const final = rounds[rounds.length - 1][0];
    final.kind = 'final';
    const loserSources = match => Array.from({ length: match.sources.length - 1 }, (_, loserIndex) => ({ match: match.id, loser: true, loserIndex }));
    let placementMatch = null;
    if (final.sources.length === 3) {
      placementMatch = { id: 'm' + (matches.length + 1), kind: 'silver', round: null, sources: loserSources(final), winner: null, results: [] };
      matches.push(placementMatch);
    } else if (rounds.length > 1) {
      const semifinals = rounds[rounds.length - 2];
      placementMatch = { id: 'm' + (matches.length + 1), kind: 'bronze', round: null, sources: semifinals.flatMap(loserSources), winner: null, results: [] };
      matches.splice(matches.length - 1, 0, placementMatch);
    }
    matches.forEach((match, sequence) => { match.sequence = sequence; });
    return { players, rounds, matches, finalMatchId: final.id, placementMatchId: placementMatch?.id || null };
  }
  function getCurrentMatch(tournament) { return tournament.matches.find(match => !match.winner) || null; }
  function getMatchPlayers(tournament, match) {
    return match.sources.map(source => {
      if (source.player) return tournament.players.find(player => player.id === source.player) || null;
      const previous = tournament.matches.find(item => item.id === source.match);
      if (!previous?.winner) return null;
      if (source.loser) return getMatchPlayers(tournament, previous).filter(player => player && player.id !== previous.winner)[source.loserIndex] || null;
      return tournament.players.find(player => player.id === previous.winner) || null;
    });
  }
  function buildRoundDraw(tournament, roundIndex, shuffle = false, pick = randomInt) {
    const round = tournament.rounds[roundIndex];
    if (!round) throw new Error('La fase no existe.');
    const groups = round.map(match => ({ matchId: match.id, players: getMatchPlayers(tournament, match) }));
    if (groups.some(group => group.players.some(player => !player))) throw new Error('Aún faltan resultados para formar esta fase.');
    if (!shuffle) return groups;
    const pool = groups.flatMap(group => group.players), mixed = createDeck(pool, pool.length, pick);
    let offset = 0;
    return groups.map(group => { const players = mixed.slice(offset, offset + group.players.length); offset += players.length; return { matchId: group.matchId, players }; });
  }
  function getMatchScore(tournament, match) {
    return getMatchPlayers(tournament, match).filter(Boolean).map(player => ({ player, points: match.results.filter(result => result.playerId === player.id).length }));
  }
  function getMatchResolution(tournament, match) {
    const results = match.results, length = results.length;
    if (length === 4) return { type: 'winner', winnerId: results[3].playerId, reason: 'sudden-death' };
    if (length >= 2 && results[length-1].playerId === results[length-2].playerId) return { type: 'winner', winnerId: results[length-1].playerId, reason: 'streak' };
    if (length < VERSES_PER_MATCH) return { type: 'playing' };
    const scores = getMatchScore(tournament, match), max = Math.max(...scores.map(score => score.points));
    const leaders = scores.filter(score => score.points === max);
    if (leaders.length === 1) return { type: 'winner', winnerId: leaders[0].player.id, reason: 'points' };
    return { type: 'sudden-death' };
  }
  function getMatchLeaders(tournament, match) {
    const resolution = getMatchResolution(tournament, match);
    if (resolution.type === 'playing') return [];
    if (resolution.type === 'winner') return tournament.players.filter(player => player.id === resolution.winnerId);
    return getMatchPlayers(tournament, match).filter(Boolean);
  }
  function recordPoint(tournament, matchId, playerId, reference) {
    const match = getCurrentMatch(tournament);
    if (!match || match.id !== matchId) throw new Error('Ese enfrentamiento no está activo.');
    const resolution = getMatchResolution(tournament, match);
    if (resolution.type === 'winner') throw new Error('El duelo ya tiene un ganador.');
    if (!getMatchPlayers(tournament, match).some(player => player?.id === playerId)) throw new Error('Elige a una persona de este duelo.');
    if (typeof reference !== 'string' || !reference.trim() || tournament.matches.some(item => item.results.some(result => result.reference === reference))) throw new Error('La cita ya se usó o no es válida.');
    match.results.push({ playerId, reference, suddenDeath: resolution.type === 'sudden-death' });
    return getMatchScore(tournament, match);
  }
  function recordWinner(tournament, matchId, playerId) {
    const match = getCurrentMatch(tournament);
    if (!match || match.id !== matchId) throw new Error('Ese enfrentamiento no está activo.');
    const resolution = getMatchResolution(tournament, match);
    if (resolution.type !== 'winner' || resolution.winnerId !== playerId) throw new Error('Aún no hay un ganador válido. Registra el siguiente punto.');
    match.winner = playerId; match.reason = resolution.reason;
    return tournament.players.find(player => player.id === playerId);
  }
  function getPodium(tournament) {
    if (getCurrentMatch(tournament)) return [];
    const final = tournament.matches.find(match => match.id === tournament.finalMatchId);
    const placement = tournament.matches.find(match => match.id === tournament.placementMatchId);
    const champion = tournament.players.find(player => player.id === final.winner);
    const finalOthers = getMatchPlayers(tournament, final).filter(player => player.id !== champion.id);
    const runnerUp = finalOthers.length === 1 ? finalOthers[0] : tournament.players.find(player => player.id === placement.winner);
    const third = placement?.kind === 'bronze' ? tournament.players.find(player => player.id === placement.winner)
      : placement ? getMatchPlayers(tournament, placement).find(player => player.id !== runnerUp.id) : null;
    return [champion, runnerUp, third].filter(Boolean).map((player, index) => ({ place: index + 1, player }));
  }
  root.EsgrimaEngine = { parseReferences, createDeck, parsePlayers, tournamentSize, createTournament, getCurrentMatch, getMatchPlayers, recordPoint, getMatchScore, getMatchLeaders, getMatchResolution, recordWinner, buildRoundDraw, getPodium, VERSES_PER_MATCH };
  if (typeof module !== 'undefined') module.exports = root.EsgrimaEngine;
})(typeof globalThis !== 'undefined' ? globalThis : window);
