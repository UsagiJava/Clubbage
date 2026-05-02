// ---------------------------------------------------------------------------
// Hand Scoring (show phase) — called after the play phase, once per hand.
// ---------------------------------------------------------------------------

// hand = array of card objects, starter = single card object
export function scoreFifteens(hand, starter) {
    // TODO: generate every subset of the 5-card group (hand + starter),
    // sum pegValues, award 2 pts per subset that totals 15.
    return 0;
}

// hand = array of card objects, starter = single card object
export function scorePairs(hand, starter) {
    // TODO: count rank matches across all 5 cards,
    // award 2 pts per unique pair combination. 3 = 6 pts, 4 = 12 pts.
    return 0;
}

// hand = array of card objects, starter = single card object
export function scoreRuns(hand, starter) {
    // TODO: find the longest run(s) among the 5 cards.
    // Handle double/triple runs caused by pairs within the run.
    return 0;
}

// hand = array of card objects, starter = single card object, isCrib = boolean if scoring the crib
export function scoreFlush(hand, starter, isCrib = false) {
    // TODO: check for 4 or more of same suit in hand, and if crib, needs 5 of the same suit to score.
    return 0;
}

// hand = array of card objects, starter = single card object
export function scoreNobs(hand, starter) {
    // TODO: find a Jack in hand with suit === starter.suit. Award 1 pt if found else 0.
    return 0;
}

// run all show-phase scoring and return a breakdown.
export function scoreHand(hand, starter, isCrib = false) {
    const fifteens = scoreFifteens(hand, starter);
    const pairs    = scorePairs(hand, starter);
    const runs     = scoreRuns(hand, starter);
    const flush    = scoreFlush(hand, starter, isCrib);
    const nobs     = scoreNobs(hand, starter);
    const total    = fifteens + pairs + runs + flush + nobs;
    return { fifteens, pairs, runs, flush, nobs, total };
}

// ---------------------------------------------------------------------------
// Pegging (play phase) — called after each card is played to the play deck.
// ---------------------------------------------------------------------------

// hit "two for his heels" (nibs): if the starter card cut by the dealer is a Jack = 2 pts for the dealer.
export function scoreNibs(starter) {
    return starter.rank === 'J' ? 2 : 0;
}

// hit "fifteen" during pegging: if running total of played cards hits exactly 15 = 2 pts.
export function scorePeggingFifteen(playedCards) {
    const sum = playedCards.reduce((acc, c) => acc + c.pegValue, 0);
    return sum === 15 ? 2 : 0;
}

// hit "thirty-one" during pegging: if running total of played cards hits exactly 31 = 2 pts.
export function scorePeggingThirtyOne(playedCards) {
    const sum = playedCards.reduce((acc, c) => acc + c.pegValue, 0);
    return sum === 31 ? 2 : 0;
}

// hit "pairs" during pegging: last 2, 3, or 4 played cards share the same rank.
export function scorePeggingPairs(playedCards) {
    if (playedCards.length < 2) return 0;
    const lastRank = playedCards[playedCards.length - 1].rank;
    let count = 0;
    for (let i = playedCards.length - 1; i >= 0; i--) {
        if (playedCards[i].rank === lastRank) count++;
        else break;
    }
    if (count === 2) return 2;
    if (count === 3) return 6;
    if (count === 4) return 12;
    return 0;
}

// hit "runs" during pegging: last 3+ played cards (in any order) form a consecutive sequence.
export function scorePeggingRun(playedCards) {
    for (let len = playedCards.length; len >= 3; len--) {
        const slice = playedCards.slice(playedCards.length - len);
        const runValues = slice.map(c => c.runValue).sort((a, b) => a - b);
        if (new Set(runValues).size !== len) continue; // duplicates disqualify a run
        let isRun = true;
        for (let i = 1; i < runValues.length; i++) {
            if (runValues[i] !== runValues[i - 1] + 1) { isRun = false; break; }
        }
        if (isRun) return len;
    }
    return 0;
}

// hit "last card" (Go): the player who plays the last card before 31 or a Go scores 1 pt. called only when a Go or last-card situation is confirmed.
export function scorePeggingLastCard() {
    return 1;
}

// run all pegging scoring and return a breakdown. called after each card is played, with the current play deck state.
// note: nibs (scoreNibs) is awarded once for the starter card in phaseBarrage, not here.
export function scorePegging(playedCards, isLastCard = false) {
    const fifteen   = scorePeggingFifteen(playedCards);
    const thirtyOne = scorePeggingThirtyOne(playedCards);
    const pairs     = scorePeggingPairs(playedCards);
    const run       = scorePeggingRun(playedCards);
    const lastCard  = isLastCard ? scorePeggingLastCard() : 0;
    const total     = fifteen + thirtyOne + pairs + run + lastCard;
    return { fifteen, thirtyOne, pairs, run, lastCard, total };
}