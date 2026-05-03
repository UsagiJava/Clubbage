import { Deck } from './Deck.js';
import * as cribbageRules from './cribbageRules.js';

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const DECK_MAIN_SIZE = 52;
const DECK_CRIB_SIZE = 4;
const DECK_PLAY_SIZE = 8;
const DECK_FLIP_SIZE = 1;
const DECK_PLAYER_SIZE = 6;
const PLAYER_MAX_HP = 50;
const HP_BAR_FULL_WIDTH_PX = 200;
const MAIN_NAME = ['Main Deck'];
const CRIB_NAME = ['Crib Deck'];
const PLAY_NAME = ['Play Deck'];
const FLIP_NAME = ['Flip Deck'];
const PLAYER_NAMES = ['Player 1', 'Player 2']; // Display Names Of Characters For Game UI Placeholder.

let gameState = {
    running: false,
    decks: {},
    round: 1,
    cribOwner: 1,
    phase: 'cornerSelection',
    cornerBreakCompleteResolver: null,
    barrageCompleteResolver: null,
    barrage: {
        pegSequence: [], // cards played since last peg-sequence reset (31 or Go)
        pegCount: 0      // running sum of pegValues in the current sequence
    }
};

// Namespace of scoring helpers exported by cribbageRules.js
// Use like: cribbageRules.scoreHand(handCards, starterCard, false)
window.cribbageRules = cribbageRules;

// hook up event listeners for send buttons. function will determine where to send cards based on gameState.phase.
document.getElementById('btn_player1_send').addEventListener('click', setTargetDeckForSend);
document.getElementById('btn_player2_send').addEventListener('click', setTargetDeckForSend);
function setTargetDeckForSend(event) {
    // check gameState.phase to determine which deck to send cards to (cribDeck during cornerBreak, playDeck during barrage).
    const phase = gameState.phase;
    let targetDeckName = (gameState.phase === 'cornerBreak') ? 'cribDeck' : (gameState.phase === 'barrage') ? 'playDeck' : null;
    if (!targetDeckName) {
        console.warn(`Send button should not be active during phase: ${phase}`);
        return;
    } else {
        const fromDeckName = event.currentTarget.id.includes('player1') ? 'player1Deck' : 'player2Deck';
        sendCards(fromDeckName, targetDeckName, null, true);
    }
}

function updateCribDeckAlignment() {
    const cribDeckElement = document.getElementById('deck_id_cribDeck');
    if (!cribDeckElement) return;
    // move cribDeckElement inside #player1_cribDeck or #player2_cribDeck base on gameState.cribOwner.
    const parentElement = document.getElementById(`player${gameState.cribOwner}_cribDeck`);
    if (parentElement && cribDeckElement.parentNode !== parentElement) {
        parentElement.appendChild(cribDeckElement);
    }
}

// Called by "Start Game" button.
function initGame() {
    if(!gameState.running) {
        gameState.running = true;

        // Store decks by string id so code can use dot notation like gameState.decks.mainDeck.
        gameState.decks = {
            mainDeck: {
                name: MAIN_NAME[0],
                deck: new Deck('deck_id_mainDeck', DECK_MAIN_SIZE, SUITS, RANKS),
                score: 0,
                hasPlayedOne: false
            },
            cribDeck: {
                name: CRIB_NAME[0],
                deck: new Deck('deck_id_cribDeck', DECK_CRIB_SIZE, SUITS, RANKS),
                score: 0
            },
            playDeck: {
                name: PLAY_NAME[0],
                deck: new Deck('deck_id_playDeck', DECK_PLAY_SIZE, SUITS, RANKS),
                score: 0
            },
            player1Deck: {
                name: PLAYER_NAMES[0],
                deck: new Deck('deck_id_player1Deck', DECK_PLAYER_SIZE, SUITS, RANKS),
                score: 0,
                maxHp: PLAYER_MAX_HP,
                currentHp: PLAYER_MAX_HP,
                corner: '#F08080',
                hasSentToCrib: false,
                hasPlayedOne: false
            },
            player2Deck: {
                name: PLAYER_NAMES[1],
                deck: new Deck('deck_id_player2Deck', DECK_PLAYER_SIZE, SUITS, RANKS),
                score: 0,
                maxHp: PLAYER_MAX_HP,
                currentHp: PLAYER_MAX_HP,
                corner: '#4169E1',
                hasSentToCrib: false,
                hasPlayedOne: false
            },
            flipDeck: {
                name: FLIP_NAME[0],
                deck: new Deck('deck_id_flipDeck', DECK_FLIP_SIZE, SUITS, RANKS),
                score: 0
            }
        };

        // create the card objects for the game (with suit, rank, id, pegValue, runValue) and add those cards to the main deck cards array.
        const gameCards = [];
        for (const suit of SUITS) {
            for (const rank of RANKS) {
                console.log(`Creating card: ${rank} of ${suit}`);
                gameCards.push({ suit, rank, id: `${rank}-${suit}`, pegValue: getPegValue(rank), runValue: getRunValue(rank) });
            }
        }
        const mainDeck = gameState.decks.mainDeck.deck;
        mainDeck.cards = gameCards;

        // display the main deck cards in the "Main Deck" section of the page.
        showDeck('deck_id_mainDeck', mainDeck);
        console.log("initGame() called, game state initialized:", gameState);

        // disable/hide start button.
        document.getElementById('btn_main_start').classList.add('d-none');
        updatePlayerHpUi('player1Deck');
        updatePlayerHpUi('player2Deck');
        refreshDecks();

        runGame();
    }
}

// A coin is flipped at the start of a fight to determine which corner a player will get. If the Player guesses correctly, they will get the red/home corner. This means they'll start as "dealer" and gets the first crib.
function phaseCornerSelection() {
    gameState.phase = 'cornerSelection';
    addCommentaryEntry('PHASE: Corner Selection.', 'game_info');
    if (Math.random() < 0.5) {
        gameState.decks.player1Deck.corner = '#F08080';
        gameState.decks.player2Deck.corner = '#4169E1';
        addCommentaryEntry(['Flipping Coin...', { text: gameState.decks.player1Deck.name, italic: true, color: gameState.decks.player1Deck.corner }, ' won the coin flip and will take the ', { text: 'red', color: gameState.decks.player1Deck.corner }, ' corner! [', { text: gameState.decks.player1Deck.name, italic: true, color: gameState.decks.player1Deck.corner }, ' gets first crib]'], 'game_success');
        gameState.cribOwner = 1;
        updateCribDeckAlignment();
        gameState.decks.player1Deck.hasPlayedOne = true; // player is dealer; setup opponent to play a card first in the barrage phase.
        gameState.decks.player2Deck.hasPlayedOne = false;
        // set the grandparent element of player1Deck and player2Deck to the respective corner colors to visually indicate corners in the UI.
        document.getElementById('deck_id_player1Deck').parentElement.parentElement.style.backgroundColor = '#F08080';
        document.getElementById('deck_id_player2Deck').parentElement.parentElement.style.backgroundColor = '#4169E1';
    } else {
        gameState.decks.player1Deck.corner = '#4169E1';
        gameState.decks.player2Deck.corner = '#F08080';
        addCommentaryEntry(['Flipping Coin...', { text: gameState.decks.player1Deck.name, italic: true, color: gameState.decks.player1Deck.corner }, ' lost the coin flip and will take the ', { text: 'blue', color: gameState.decks.player1Deck.corner }, ' corner. [', { text: gameState.decks.player2Deck.name, italic: true, color: gameState.decks.player2Deck.corner }, ' gets first crib]'], 'game_success');
        gameState.cribOwner = 2;
        updateCribDeckAlignment();
        document.getElementById('deck_id_player1Deck').parentElement.parentElement.style.backgroundColor = '#4169E1';
        document.getElementById('deck_id_player2Deck').parentElement.parentElement.style.backgroundColor = '#F08080';
        gameState.decks.player1Deck.hasPlayedOne = false; // opponent is dealer. setup player to play a card first in the barrage phase.
        gameState.decks.player2Deck.hasPlayedOne = true;
    }
}

async function runGame() {
    addCommentaryEntry('Clubbage Game Started.', 'game_success');

    // Each fight will start with a "Corner Selection" phase, and end with a "Training Montage" (increases hitpoints).  For now, just one opponent and no training for next fight.
    phaseCornerSelection();

    // Game loop will go through;
    // 1) "Corner Break" phase. Fighters select what cards to pass to crib. Fighters can ask Trainer for advice on what to pass to crib.
    // 2) "Round Start" phase. Bell Rings.
    // 3) "Barrage" phase. Fighters alternate playing a card from their hand. blocks (if defender missed a punch last card), dodges (if a defender landed a punch last card), jabs (1-2 pts), hooks (3-4 pts), and uppercuts (5-6 pts) happen here.
    // 4) "Closing the Round" phase. random block or dodge happens of 0 crib points scored, else a jab, hook, or uppercuts happens here.
    // 5) "Round End" phase. Bell Rings. Increament round counter. Check for game end condition. If not end, loop back to "Corner Break" phase.

    while(gameState.round <= 3) {
        await phaseCornerBreak();
        phaseRoundStart();
        await phaseBarrage();
        phaseClosingRound();
        await phaseRoundEnd();
    }
}

async function phaseCornerBreak() {
    gameState.phase = 'cornerBreak';
    gameState.decks.player1Deck.hasSentToCrib = false;
    gameState.decks.player2Deck.hasSentToCrib = false;
    addCommentaryEntry('[Corner Break] start.', 'game_info');
    addCommentaryEntry('[Corner Break] shuffling deck and dealing cards to fighters...', 'game_info');
    shuffleDeck('deck_id_mainDeck', 'mainDeck');
    dealToPlayers();
    await waitPhaseCornerBreakComplete();
}
    function waitPhaseCornerBreakComplete() {
        if (isCornerBreakComplete()) {
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            gameState.cornerBreakCompleteResolver = resolve;
        });
    }
        function isCornerBreakComplete() {
            return gameState.phase === 'cornerBreak' &&
                gameState.decks.player1Deck.hasSentToCrib &&
                gameState.decks.player2Deck.hasSentToCrib &&
                gameState.decks.cribDeck.deck.getCardCount() === DECK_CRIB_SIZE;
        }

function phaseRoundStart() {
    gameState.phase = 'roundStart';
    addCommentaryEntry(['[Round Start] Round ', { text: gameState.round }, '. Bell rings. FIGHT!'], 'game_info');
}

async function phaseBarrage() {
    gameState.phase = 'barrage';
    // send card from mainDeck to flipDeck to simulate cutting the deck and revealing the starter card.
    sendCards('mainDeck', 'flipDeck', 1, false);
    addCommentaryEntry('[Barrage] start.', 'game_info');

    // call scoreNibs for the starter card and award points to the crib owner if starter card is a Jack.
    const starterCard = gameState.decks.flipDeck.deck.getCards()[0];
    const nibsPoints = cribbageRules.scoreNibs(starterCard);

    // if dealer owner scored nibs, add those points to their gameState.decks.playerXDeck.score and add a commentary entry about it.
    if (nibsPoints > 0) {
        const cribOwnerDeck = gameState.cribOwner === 1 ? gameState.decks.player1Deck : gameState.decks.player2Deck;
        const nonCribOwnerDeck = gameState.cribOwner === 1 ? gameState.decks.player2Deck : gameState.decks.player1Deck;
        cribOwnerDeck.score += nibsPoints;
        addCommentaryEntry([{ text: cribOwnerDeck.name, italic: true, color: cribOwnerDeck.corner }, ' hits a ', { text: 'jab', bold: true }, ' on ', { text: nonCribOwnerDeck.name, italic: true, color: nonCribOwnerDeck.corner }, ' for ', { text: '2 damage', underline: true }, '. [nibs]'], 'game_action');
    }

    // Reset the peg sequence for this round's barrage.
    gameState.barrage.pegSequence = [];
    gameState.barrage.pegCount = 0;

    await waitPhaseBarrageComplete();
}
function waitPhaseBarrageComplete() {
    if (isBarrageComplete()) {
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        gameState.barrageCompleteResolver = resolve;
    });
}
function isBarrageComplete() {
    return gameState.phase === 'barrage' &&
        gameState.decks.playDeck.deck.getCardCount() === DECK_PLAY_SIZE;
}

function describeShowScoring(result) {
    const reasons = [];
    if (result.fifteens > 0) reasons.push(`fifteens (${result.fifteens})`);
    if (result.pairs > 0) reasons.push(`pairs (${result.pairs})`);
    if (result.runs > 0) reasons.push(`runs (${result.runs})`);
    if (result.flush > 0) reasons.push(`flush (${result.flush})`);
    if (result.nobs > 0) reasons.push(`nobs (${result.nobs})`);
    return reasons.length > 0 ? reasons.join(', ') : 'no score';
}

function applyClosingRoundScore(scoringDeckName, points, reasonLabel) {
    if (points <= 0) return;

    const scoringDeck = gameState.decks[scoringDeckName];
    const otherPlayerDeckName = scoringDeckName === 'player1Deck' ? 'player2Deck' : 'player1Deck';
    const otherPlayerDeck = gameState.decks[otherPlayerDeckName];

    scoringDeck.score += points;
    applyDamageToPlayer(otherPlayerDeckName, points);

    const attackName = points <= 2 ? 'jab' : points <= 4 ? 'hook' : 'uppercut';
    addCommentaryEntry([
        { text: scoringDeck.name, italic: true, color: scoringDeck.corner },
        attackName === 'jab' ? ' lands a ' : attackName === 'hook' ? ' delivers a ' : ' sends an ',
        { text: attackName, bold: true },
        attackName === 'jab' ? ' on ' : ' to ',
        { text: otherPlayerDeck.name, italic: true, color: otherPlayerDeck.corner },
        ' for ',
        { text: `${points} damage`, underline: true },
        `. [${reasonLabel}]`
    ], 'game_action');
}

function scoreClosingRoundHands() {
    const starterCard = gameState.decks.flipDeck.deck.getCards()[0];
    if (!starterCard) {
        addCommentaryEntry('[Closing Round] no starter card in flip deck; skipping hand scoring.', 'game_warning');
        return;
    }

    const playCards = gameState.decks.playDeck.deck.getCards();
    const player1Hand = playCards.filter(card => card.ownerDeck === 'player1Deck');
    const player2Hand = playCards.filter(card => card.ownerDeck === 'player2Deck');

    if (player1Hand.length !== 4 || player2Hand.length !== 4) {
        addCommentaryEntry(
            `[Closing Round] expected 4 cards per player in play deck, found ${player1Hand.length} and ${player2Hand.length}.`,
            'game_warning'
        );
    }

    const nonDealerDeckName = gameState.cribOwner === 1 ? 'player2Deck' : 'player1Deck';
    const dealerDeckName = gameState.cribOwner === 1 ? 'player1Deck' : 'player2Deck';

    const scoringOrder = [
        { deckName: nonDealerDeckName, hand: nonDealerDeckName === 'player1Deck' ? player1Hand : player2Hand, label: 'hand' },
        { deckName: dealerDeckName, hand: dealerDeckName === 'player1Deck' ? player1Hand : player2Hand, label: 'hand' }
    ];

    for (const item of scoringOrder) {
        const result = cribbageRules.scoreHand(item.hand, starterCard, false);
        applyClosingRoundScore(item.deckName, result.total, `${item.label}: ${describeShowScoring(result)}`);
    }

    const cribCards = gameState.decks.cribDeck.deck.getCards();
    const cribResult = cribbageRules.scoreHand(cribCards, starterCard, true);
    applyClosingRoundScore(dealerDeckName, cribResult.total, `crib: ${describeShowScoring(cribResult)}`);
}

function phaseClosingRound() {
    gameState.phase = 'closingRound';
    addCommentaryEntry('Bell is about to ring. Close the round strong!', 'game_info');
    scoreClosingRoundHands();
}

async function phaseRoundEnd() {
    gameState.phase = 'roundEnd';
    addCommentaryEntry(['[Round End] Round ', { text: gameState.round }, '. Bell rings. Back to corners.'], 'game_info');
    // send all cards from playDeck, flipDeck, cribDeck back to mainDeck to simulate gathering up the cards and returning them to the main deck.
    sendCards('playDeck', 'mainDeck', DECK_PLAY_SIZE, false);
    sendCards('flipDeck', 'mainDeck', DECK_FLIP_SIZE, false);
    sendCards('cribDeck', 'mainDeck', DECK_CRIB_SIZE, false);
    gameState.round++;
    // change the crib owner for the next round.
    gameState.cribOwner = (gameState.cribOwner === 1) ? 2 : 1;
    updateCribDeckAlignment();
    // reset hasPlayedOne for both players for the next round so that non-dealer has to play first during barrage phase.
    gameState.decks.player1Deck.hasPlayedOne = (gameState.cribOwner === 1);
    gameState.decks.player2Deck.hasPlayedOne = (gameState.cribOwner === 2);
}


// function to handle when a mouse click event occurs on a card element to toggle a "selected" highlighting class.
// if keeping gameState.phase, redo if/elseif so that the repeated code isn't repeated.
function onCardClick(event) {
    const cardEl = event.currentTarget;
    const deckId = cardEl.dataset.deckId;
    const selectedCount = document.querySelectorAll(`.game_card.selected[data-deck-id="${deckId}"]`).length;
    if (gameState.phase === 'cornerBreak') {
        if (cardEl.classList.contains('selected')) {
            // Always allow deselecting
            cardEl.classList.remove('selected');
        } else {
            if (selectedCount < 2) {
                cardEl.classList.add('selected');
            } else {
                // Already at 2 — shake the card to signal the limit
                cardEl.classList.add('shake');
                cardEl.addEventListener('animationend', () => cardEl.classList.remove('shake'), { once: true });
                return;
            }
        }
    } else if (gameState.phase === 'barrage') {
        if (cardEl.classList.contains('selected')) {
            // Always allow deselecting
            cardEl.classList.remove('selected');
        } else {
            if (selectedCount < 1) {
                cardEl.classList.add('selected');
            } else {
                // Already at 1 — shake the card to signal the limit
                cardEl.classList.add('shake');
                cardEl.addEventListener('animationend', () => cardEl.classList.remove('shake'), { once: true });
                return;
            }
        }
    } else {
        cardEl.classList.toggle('selected');
    }
}

function updatePlayerHpUi(playerDeckName) {
    const playerDeck = gameState.decks[playerDeckName];
    if (!playerDeck) return;
    const idBase = playerDeckName === 'player1Deck' ? 'player1' : 'player2';
    const hpRemainingEl = document.querySelector(`#${idBase}_hp_remaining`);
    const statsEl = document.querySelector(`#${idBase}_stats`);
    if (!hpRemainingEl || !statsEl) return;

    const hpRatio = playerDeck.maxHp > 0 ? (playerDeck.currentHp / playerDeck.maxHp) : 0;
    const clampedRatio = Math.max(0, Math.min(1, hpRatio));
    hpRemainingEl.style.width = `${Math.round(HP_BAR_FULL_WIDTH_PX * clampedRatio)}px`;
    statsEl.textContent = `${playerDeck.currentHp}/${playerDeck.maxHp}`;
}

function applyDamageToPlayer(playerDeckName, damage) {
    const playerDeck = gameState.decks[playerDeckName];
    if (!playerDeck || damage <= 0) return;
    playerDeck.currentHp = Math.max(0, playerDeck.currentHp - damage);
    updatePlayerHpUi(playerDeckName);
}

// Evaluates pegging scoring after a player plays a card to the play deck during barrage.
function evaluateBarragePegging(fromDeckName, playedCard) {
    gameState.barrage.pegSequence.push(playedCard);
    gameState.barrage.pegCount += playedCard.pegValue;

    const otherPlayerDeckName = (fromDeckName === 'player1Deck') ? 'player2Deck' : 'player1Deck';
    const pegCount = gameState.barrage.pegCount;
    const currentPlayerCanPlay = gameState.decks[fromDeckName].deck.getCards().some(c => pegCount + c.pegValue <= 31);
    const opponentCanPlay = gameState.decks[otherPlayerDeckName].deck.getCards().some(c => pegCount + c.pegValue <= 31);
    const isLastCard = !currentPlayerCanPlay && !opponentCanPlay;

    const result = cribbageRules.scorePegging(gameState.barrage.pegSequence, isLastCard);

    if (result.total > 0) {
        const scoringDeck = gameState.decks[fromDeckName];
        const opponentDeck = gameState.decks[otherPlayerDeckName];
        scoringDeck.score += result.total;

        const attackName = result.total <= 2 ? 'jab' : result.total <= 4 ? 'hook' : 'uppercut';
        const reasons = [];
        if (result.fifteen > 0) reasons.push('fifteen');
        if (result.thirtyOne > 0) reasons.push('thirty-one');
        if (result.pairs === 2) reasons.push('a pair');
        if (result.pairs === 6) reasons.push('3 of a kind');
        if (result.pairs === 12) reasons.push('4 of a kind');
        if (result.run > 0) reasons.push(`run of ${result.run}`);
        if (result.lastCard > 0) reasons.push('last card');
        applyDamageToPlayer(otherPlayerDeckName, result.total);
        addCommentaryEntry([
            { text: scoringDeck.name, italic: true, color: scoringDeck.corner },
            // if jab, use 'hits a', if hook, use 'delivers a', if uppercut, use 'sends an'
            attackName === 'jab' ? ' hits a ' : attackName === 'hook' ? ' delivers a ' : ' sends an ',
            { text: attackName, bold: true },
            // if jab, use 'on', else use 'to'
            attackName === 'jab' ? ' on ' : ' to ',
            { text: opponentDeck.name, italic: true, color: opponentDeck.corner },
            ' for ',
            { text: `${result.total} damage`, underline: true },
            `. [${reasons.join(', ')}]`
        ], 'game_action');
    }

    // Reset peg sequence after 31 is hit or neither player can play (Go).
    if (result.thirtyOne > 0 || isLastCard) {
        gameState.barrage.pegSequence = [];
        gameState.barrage.pegCount = 0;
    }
}

function canDeckPlayAtPegCount(deckName) {
    const deckInfo = gameState.decks[deckName];
    if (!deckInfo) return false;
    return deckInfo.deck.getCards().some(card => gameState.barrage.pegCount + card.pegValue <= 31);
}

function handleBarrageGo(fromDeckName) {
    const fromDeck = gameState.decks[fromDeckName];
    const otherPlayerDeckName = (fromDeckName === 'player1Deck') ? 'player2Deck' : 'player1Deck';
    const otherPlayerDeck = gameState.decks[otherPlayerDeckName];
    if (!fromDeck || !otherPlayerDeck) return false;

    // Not this player's turn or they still have a legal play: this is not a Go.
    if (fromDeck.hasPlayedOne || canDeckPlayAtPegCount(fromDeckName)) return false;

    addCommentaryEntry([
        { text: fromDeck.name, italic: true, color: fromDeck.corner },
        ' calls ',
        { text: 'Go', bold: true },
        '.'
    ], 'game_warning');

    const opponentCanPlay = canDeckPlayAtPegCount(otherPlayerDeckName);
    if (opponentCanPlay) {
        fromDeck.hasPlayedOne = true;
        otherPlayerDeck.hasPlayedOne = false;
        refreshDecks();
        return true;
    }

    // Neither player can play at this count. Award last-card point and reset count.
    if (gameState.barrage.pegSequence.length > 0 && gameState.barrage.pegCount < 31) {
        const lastPlayedCard = gameState.barrage.pegSequence[gameState.barrage.pegSequence.length - 1];
        const lastPlayerDeckName = lastPlayedCard.ownerDeck;
        const defendingDeckName = (lastPlayerDeckName === 'player1Deck') ? 'player2Deck' : 'player1Deck';
        const lastPlayerDeck = gameState.decks[lastPlayerDeckName];
        const defendingDeck = gameState.decks[defendingDeckName];

        if (lastPlayerDeck && defendingDeck) {
            lastPlayerDeck.score += 1;
            applyDamageToPlayer(defendingDeckName, 1);
            addCommentaryEntry([
                { text: lastPlayerDeck.name, italic: true, color: lastPlayerDeck.corner },
                ' hits a ',
                { text: 'jab', bold: true },
                ' on ',
                { text: defendingDeck.name, italic: true, color: defendingDeck.corner },
                ' for ',
                { text: '1 damage', underline: true },
                '. [last card at Go]'
            ], 'game_action');
        }
    }

    gameState.barrage.pegSequence = [];
    gameState.barrage.pegCount = 0;
    // After a full Go sequence, the player who first said Go leads the next count.
    fromDeck.hasPlayedOne = false;
    otherPlayerDeck.hasPlayedOne = true;

    addCommentaryEntry('[Barrage] peg count resets to 0 after Go.', 'game_info');
    refreshDecks();
    return true;
}

function getActiveBarragePlayerDeckName() {
    const p1Played = gameState.decks.player1Deck.hasPlayedOne;
    const p2Played = gameState.decks.player2Deck.hasPlayedOne;
    if (!p1Played && p2Played) return 'player1Deck';
    if (!p2Played && p1Played) return 'player2Deck';
    return null;
}

function processForcedBarrageGoIfNeeded() {
    if (gameState.phase !== 'barrage') return;

    let guard = 0;
    while (!isBarrageComplete() && guard < 4) {
        const activeDeckName = getActiveBarragePlayerDeckName();
        if (!activeDeckName) break;

        const activeDeck = gameState.decks[activeDeckName];
        const hasAnyCards = activeDeck?.deck.getCardCount() > 0;
        const canPlay = hasAnyCards && canDeckPlayAtPegCount(activeDeckName);
        if (canPlay) break;

        const handledGo = handleBarrageGo(activeDeckName);
        if (!handledGo) break;
        guard++;
    }
}

function sendCards(fromDeckName, toDeckName, numCards = null, specificCards = false) {
    const gsFromDeckProps = gameState.decks[fromDeckName];
    const phase = gameState.phase;
    const gsFromDeckPropsDeck = gsFromDeckProps.deck;
    const gsToDeckPropsDeck = gameState.decks[toDeckName].deck;
    const isPlayerDeck = fromDeckName === 'player1Deck' || fromDeckName === 'player2Deck';
    const selectedCardElements = specificCards ? Array.from(document.querySelectorAll(`.game_card.selected[data-deck-id="${gsFromDeckPropsDeck.id}"]`)) : [];
    const numOfSpecificCards = selectedCardElements.length;
    const cardsToSend = specificCards ? numOfSpecificCards : (numCards !== null ? numCards : gsFromDeckPropsDeck.getCards().length);
    const isBarrageFlipCutMove = phase === 'barrage' && fromDeckName === 'mainDeck' &&
                                 toDeckName === 'flipDeck' && !specificCards && cardsToSend === 1;
    const isRoundEndGatherMove = phase === 'roundEnd' && toDeckName === 'mainDeck' && !specificCards &&
                                 (fromDeckName === 'playDeck' || fromDeckName === 'flipDeck' || fromDeckName === 'cribDeck');
    let invalidReason = null;
    if (specificCards && !isPlayerDeck) {
        invalidReason = `specific card selection is only allowed from player decks. Attempted from: ${fromDeckName}.`;
    } else {
        switch (phase) {
        case 'cornerBreak':
            if (gsFromDeckProps.hasSentToCrib) {
                invalidReason = `${fromDeckName} already sent cards to the crib.`;
            } else if (toDeckName !== 'cribDeck') {
                invalidReason = `cornerBreak cards must be sent to cribDeck, not ${toDeckName}.`;
            } else if (specificCards && numOfSpecificCards !== 2) {
                invalidReason = `cornerBreak requires exactly 2 selected cards, got ${numOfSpecificCards}.`;
            }
            break;
        case 'barrage':
            if (!isBarrageFlipCutMove) {
                if (gsFromDeckProps.hasPlayedOne) {
                    invalidReason = `${fromDeckName} already played this barrage turn.`;
                } else if (toDeckName !== 'playDeck') {
                    invalidReason = `barrage cards must be sent to playDeck, not ${toDeckName}.`;
                } else if (specificCards && numOfSpecificCards !== 1) {
                    invalidReason = `barrage requires exactly 1 selected card, got ${numOfSpecificCards}.`;
                } else if (specificCards && numOfSpecificCards === 1) {
                    const cardId = selectedCardElements[0].dataset.cardId;
                    const card = gsFromDeckPropsDeck.getCards().find(c => c.id === cardId);
                    if (card && gameState.barrage.pegCount + card.pegValue > 31) {
                        invalidReason = `playing ${card.rank} (${card.pegValue}) would exceed 31. Current total: ${gameState.barrage.pegCount}.`;
                    }
                }
            }
            break;
        case 'roundEnd':
            if (!isRoundEndGatherMove) {
                invalidReason = `roundEnd only allows playDeck, flipDeck, or cribDeck to return to mainDeck.`;
            }
            break;
        default:
            invalidReason = `phase ${phase} does not allow sendCards moves.`;
            break;
        }
    }

    if (invalidReason) {
        const handledGo =
            phase === 'barrage' &&
            toDeckName === 'playDeck' &&
            specificCards &&
            isPlayerDeck &&
            handleBarrageGo(fromDeckName);

        if (handledGo) {
            console.log(
                `%cGo processed - ${fromDeckName} had no legal play at ${gameState.barrage.pegCount}.`,
                'background: khaki; color: black; padding: 2px 4px;'
            );
            return;
        }

        console.log(
            `%cInvalid move - ${cardsToSend} cards from: ${fromDeckName} (${gsFromDeckProps.hasPlayedOne ?? 'n/a'}) | to: ${toDeckName} | phase: ${phase}. ${invalidReason}`,
            'background: lightcoral; color: black; padding: 2px 4px;'
        );
        return;
    }

    console.log(
        `%cConsidered Valid move - ${cardsToSend} cards from: ${fromDeckName} (${gsFromDeckProps.hasPlayedOne ?? 'n/a'}) | to: ${toDeckName} | phase: ${phase}.`,
        'background: lightgreen; color: black; padding: 2px 4px;'
    );

    if (phase === 'cornerBreak' && toDeckName === 'cribDeck') {
        gsFromDeckProps.hasSentToCrib = true;
    } else if (phase === 'barrage' && toDeckName === 'playDeck') {
        gsFromDeckProps.hasPlayedOne = true;
        const otherPlayerDeckName = (fromDeckName === 'player1Deck') ? 'player2Deck' : 'player1Deck';
        gameState.decks[otherPlayerDeckName].hasPlayedOne = false;
    }

    // pass specific selected cards or deal a number of cards from the top of the fromDeck to the toDeck.
    let barragePlayedCard = null;
    if (specificCards) {
        const selectedCards = selectedCardElements.map(cardElement => {
            const cardId = cardElement.dataset.cardId;
            return gsFromDeckPropsDeck.getCards().find(card => card.id === cardId);
        });
        if (phase === 'barrage' && toDeckName === 'playDeck' && selectedCards.length === 1) {
            barragePlayedCard = selectedCards[0];
        }
        console.log(`Specific cards selected to send from ${fromDeckName} to ${toDeckName}:`, selectedCards);
        gsFromDeckPropsDeck.pass(gsToDeckPropsDeck, selectedCards);
    } else {
        gsFromDeckPropsDeck.deal([gsToDeckPropsDeck], [cardsToSend], 'top');
    }

    if (barragePlayedCard) {
        evaluateBarragePegging(fromDeckName, barragePlayedCard);
    }
    if (phase === 'barrage' && toDeckName === 'playDeck' && barragePlayedCard) {
        processForcedBarrageGoIfNeeded();
    }
    refreshDecks();

    // Corner break is complete once both players pass 2 cards into the crib.
    if (isCornerBreakComplete()) {
        addCommentaryEntry(['Round ', { text: gameState.round }, '. Corner Break complete.'], 'game_info');
        if (gameState.cornerBreakCompleteResolver) {
            gameState.cornerBreakCompleteResolver();
            gameState.cornerBreakCompleteResolver = null;
        }
    }
    // Barrage is complete once players have alternated playing cards into the playDeck until there are 8 cards in the playDeck.
    if (isBarrageComplete()) {
        addCommentaryEntry(['Round ', { text: gameState.round }, '. Barrage complete.'], 'game_info');
        if (gameState.barrageCompleteResolver) {
            gameState.barrageCompleteResolver();
            gameState.barrageCompleteResolver = null;
        }
    }

}

function getSuitIconClass(suit) {
    switch (suit) {
    case 'hearts':
        return 'bi-suit-heart-fill text-red';
    case 'diamonds':
        return 'bi-suit-diamond-fill text-red';
    case 'clubs':
        return 'bi-suit-club-fill text-black';
    case 'spades':
        return 'bi-suit-spade-fill text-black';
    default:
        return 'bi-question-circle';
    }
}

function getPegValue(rank) {
    if (rank === "A") return 1;
    if (["J", "Q", "K"].includes(rank)) return 10;
    return parseInt(rank);
}

function getRunValue(rank) {
    if (rank === "A") return 1;
    if (rank === "J") return 11;
    if (rank === "Q") return 12;
    if (rank === "K") return 13;
    return parseInt(rank);
}

function setCardOwner(deckName, cards) {
    const ownerName = gameState.decks[deckName]?.name ?? '';
    const ownerCorner = gameState.decks[deckName]?.corner ?? '';
    for (const card of cards) {
        card.ownerDeck = deckName;
        card.ownerName = ownerName;
        card.ownerCorner = ownerCorner;
    }
}

function showDeck(locationID, deck) {
    const location = document.getElementById(locationID);
    location.innerHTML = '';
    for (const card of deck.getCards()) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'game_card';
        cardDiv.setAttribute('title', `ID: ${card.id}\nOwner: ${card.ownerName ?? 'Unassigned'}\nOwner Corner: ${card.ownerCorner ?? 'n/a'}\nPeg Value: ${card.pegValue}\nRun Value: ${card.runValue}\nSuit Order: ${deck.suitOrder[card.suit]}\nRank Order: ${deck.rankOrder[card.rank]}`);
        cardDiv.dataset.cardId = card.id;
        cardDiv.dataset.deckId = deck.id;
        cardDiv.dataset.ownerDeck = card.ownerDeck ?? '';
        cardDiv.dataset.ownerName = card.ownerName ?? '';
        cardDiv.dataset.ownerCorner = card.ownerCorner ?? '';
        // take the deck.id and remove the "deck_id_" prefix and the "Deck" suffix.
        const btnId = deck.id.replace('deck_id_', '').replace('Deck', '');
        cardDiv.dataset.sendBtnId = `btn_${btnId}_send`; // the card now contains data on which "Send" button it is associated with.
        const suitIconClass = getSuitIconClass(card.suit);
        cardDiv.innerHTML = `<div class="game_card_rank">${card.rank}</div><i class="bi ${suitIconClass} d-block" aria-label="${card.suit}"></i>`;
        cardDiv.addEventListener('click', onCardClick);
        location.appendChild(cardDiv);
    }
}

function refreshDecks() {
    for (const deckKey in gameState.decks) {
        const deckInfo = gameState.decks[deckKey];
        const locationID = `deck_id_${deckKey}`;
        showDeck(locationID, deckInfo.deck);

        // if deck is empty, disable the associated shuffle/sort/return/send buttons, otherwise enable them.
        //console.log(`Refreshing deck ${deckKey}. Card count: ${deckInfo.deck.getCardCount()}`);
        // remove the "Deck" suffix from the deckKey to get the base name for the button IDs. IE: "mainDeck" becomes "main", "player1Deck" becomes "player1", etc.
        const baseName = deckKey.replace('Deck', '');
        const shuffleButton = document.getElementById(`btn_${baseName}_shuffle`);
        const sortSuitButton = document.getElementById(`btn_${baseName}_sort_suit`);
        const sortValueButton = document.getElementById(`btn_${baseName}_sort_value`);
        const dealCardsButton = document.getElementById(`btn_${baseName}_deal_cards`);
        const sendButton = document.getElementById(`btn_${baseName}_send`);

        if (deckInfo.deck.getCardCount() === 0) {
            if (shuffleButton) shuffleButton.disabled = true;
            if (sortSuitButton) sortSuitButton.disabled = true;
            if (sortValueButton) sortValueButton.disabled = true;
            if (sendButton) sendButton.disabled = true;
        } else {
            if (shuffleButton) shuffleButton.disabled = false;
            if (sortSuitButton) sortSuitButton.disabled = false;
            if (sortValueButton) sortValueButton.disabled = false;
            if (sendButton) sendButton.disabled = false;
        }
    }
}

function shuffleDeck(locationID, deckName) {
    gameState.decks[deckName].deck.shuffle();
    refreshDecks()
}

function sortDeck(locationID, deckName, sortType) {
    gameState.decks[deckName].deck.sort(sortType);
    refreshDecks()
}

function dealToPlayers() {
    const mainDeck = gameState.decks.mainDeck.deck;
    const player1Deck = gameState.decks.player1Deck.deck;
    const player2Deck = gameState.decks.player2Deck.deck;
    mainDeck.deal([player1Deck, player2Deck], [DECK_PLAYER_SIZE, DECK_PLAYER_SIZE], 'top');
    setCardOwner('player1Deck', player1Deck.getCards());
    setCardOwner('player2Deck', player2Deck.getCards());
    refreshDecks();
    console.log("Dealt cards to players. Current game state:", gameState);
}

function addCommentaryEntry(parts, type = 'info') {
    const log = document.getElementById('gameLog');
    const entry = document.createElement('div');
    entry.className = 'game_commentary_log_entry ' + type;
    // parts can be a plain string else an array of parts of text with optional style instructions. IE: ['Player 1 hits a ', { text: 'jab', bold: true }, ' on Player 2 for 2 damage. (a pair)']
    if (typeof parts === 'string') {
        entry.textContent = parts;
    } else {
        for (const part of parts) {
            if (typeof part === 'string') {
                entry.appendChild(document.createTextNode(part));
            } else {
                const el = document.createElement('span');
                if (part.bold) el.style.fontWeight = 'bold';
                if (part.color) el.style.color = part.color;
                if (part.italic) el.style.fontStyle = 'italic';
                if (part.underline) {
                    el.style.textDecoration = 'underline';
                    el.style.textUnderlineOffset = '0.2em';
                }
                el.textContent = part.text;
                entry.appendChild(el);
            }
        }
    }

    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

window.initGame = initGame;
window.shuffleDeck = shuffleDeck;
window.sortDeck = sortDeck;
window.dealToPlayers = dealToPlayers;
window.sendCards = sendCards;