import { Deck } from './Deck.js';

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const DECK_MAIN_SIZE = 52;
const DECK_CRIB_SIZE = 4;
const DECK_PLAY_SIZE = 8;
const DECK_FLIP_SIZE = 1;
const DECK_PLAYER_SIZE = 6;
const MAIN_NAME = ['Main Deck'];
const CRIB_NAME = ['Crib Deck'];
const PLAY_NAME = ['Play Deck'];
const FLIP_NAME = ['Flip Deck'];
const PLAYER_NAMES = ['Player 1', 'Player 2']; // Display Names Of Characters For Game UI Placeholder.

let gameState = {
    running: false,
    decks: {},
    currentPlayer: 0,
    round: 1,
    cribOwner: 1,
    phase: 'cornerSelection',
    cornerBreakCompleteResolver: null,
    barrageCompleteResolver: null
};

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
                corner: '#F08080',
                hasSentToCrib: false,
                hasPlayedOne: false
            },
            player2Deck: {
                name: PLAYER_NAMES[1],
                deck: new Deck('deck_id_player2Deck', DECK_PLAYER_SIZE, SUITS, RANKS),
                score: 0,
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
        gameState.decks.player1Deck.hasPlayedOne = true; // player is dealer; setup opponent to play a card first in the barrage phase.
        gameState.decks.player2Deck.hasPlayedOne = false;
        document.getElementById('deck_id_player1Deck').style.backgroundColor = '#F08080';
        document.getElementById('deck_id_player2Deck').style.backgroundColor = '#4169E1';
    } else {
        gameState.decks.player1Deck.corner = '#4169E1';
        gameState.decks.player2Deck.corner = '#F08080';
        addCommentaryEntry(['Flipping Coin...', { text: gameState.decks.player1Deck.name, italic: true, color: gameState.decks.player1Deck.corner }, ' lost the coin flip and will take the ', { text: 'blue', color: gameState.decks.player1Deck.corner }, ' corner. [', { text: gameState.decks.player2Deck.name, italic: true, color: gameState.decks.player2Deck.corner }, ' gets first crib]'], 'game_success');
        gameState.cribOwner = 2;
        document.getElementById('deck_id_player1Deck').style.backgroundColor = '#4169E1';
        document.getElementById('deck_id_player2Deck').style.backgroundColor = '#F08080';
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
    // test how the commentary section looks for various attacks.
    // addCommentaryEntry([{ text: gameState.decks.player1Deck.name, italic: true, color: gameState.decks.player1Deck.corner }, ' hits a ', { text: 'jab', bold: true }, ' on ', { text: gameState.decks.player2Deck.name, italic: true, color: gameState.decks.player2Deck.corner }, ' for ', { text: '2 damage', underline: true }, '. [a pair]'], 'game_action');
    // addCommentaryEntry([{ text: gameState.decks.player2Deck.name, italic: true, color: gameState.decks.player2Deck.corner }, ' delivers a ', { text: 'hook', bold: true }, ' to ', { text: gameState.decks.player1Deck.name, italic: true, color: gameState.decks.player1Deck.corner }, ' for ', { text: '4 damage', underline: true }, '. [flush of four]'], 'game_action');
    // addCommentaryEntry([{ text: gameState.decks.player1Deck.name, italic: true, color: gameState.decks.player1Deck.corner }, ' sends an ', { text: 'uppercut', bold: true }, ' to ', { text: gameState.decks.player2Deck.name, italic: true, color: gameState.decks.player2Deck.corner }, ' for ', { text: '6 damage', underline: true }, '. [three of a kind]'], 'game_action');
}

async function phaseCornerBreak() {
    gameState.phase = 'cornerBreak';
    gameState.decks.player1Deck.hasSentToCrib = false;
    gameState.decks.player2Deck.hasSentToCrib = false;
    addCommentaryEntry('[Corner Break] start.', 'game_info');
    addCommentaryEntry('[Corner Break] shuffling deck.', 'game_info');
    shuffleDeck('deck_id_mainDeck', 'mainDeck');
    addCommentaryEntry('[Corner Break] dealing cards to fighters.', 'game_info');
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

function phaseClosingRound() {
    gameState.phase = 'closingRound';
    addCommentaryEntry('[Closing Round] start.', 'game_info');
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
        // set the other player's hasPlayedOne to false
        const otherPlayerDeckName = (fromDeckName === 'player1Deck') ? 'player2Deck' : 'player1Deck';
        gameState.decks[otherPlayerDeckName].hasPlayedOne = false;
    }

    // pass specific selected cards or deal a number of cards from the top of the fromDeck to the toDeck.
    if (specificCards) {
        const selectedCards = selectedCardElements.map(cardElement => {
            const cardId = cardElement.dataset.cardId;
            return gsFromDeckPropsDeck.getCards().find(card => card.id === cardId);
        });
        console.log(`Specific cards selected to send from ${fromDeckName} to ${toDeckName}:`, selectedCards);
        gsFromDeckPropsDeck.pass(gsToDeckPropsDeck, selectedCards);
    } else {
        gsFromDeckPropsDeck.deal([gsToDeckPropsDeck], [cardsToSend], 'top');
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

function showDeck(locationID, deck) {
    const location = document.getElementById(locationID);
    location.innerHTML = '';
    for (const card of deck.getCards()) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'game_card';
        cardDiv.setAttribute('title', `ID: ${card.id}\nPeg Value: ${card.pegValue}\nRun Value: ${card.runValue}\nSuit Order: ${deck.suitOrder[card.suit]}\nRank Order: ${deck.rankOrder[card.rank]}`);
        cardDiv.dataset.cardId = card.id;
        cardDiv.dataset.deckId = deck.id;
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
        const returnButton = document.getElementById(`btn_${baseName}_return_cards`);
        const dealCardsButton = document.getElementById(`btn_${baseName}_deal_cards`);
        const sendButton = document.getElementById(`btn_${baseName}_send`);

        if (deckInfo.deck.getCardCount() === 0) {
            if (shuffleButton) shuffleButton.disabled = true;
            if (sortSuitButton) sortSuitButton.disabled = true;
            if (sortValueButton) sortValueButton.disabled = true;
            if (returnButton) returnButton.disabled = true;
            if (dealCardsButton) dealCardsButton.disabled = true;
            if (sendButton) sendButton.disabled = true;
        } else {
            if (shuffleButton) shuffleButton.disabled = false;
            if (sortSuitButton) sortSuitButton.disabled = false;
            if (sortValueButton) sortValueButton.disabled = false;
            if (returnButton) returnButton.disabled = false;
            if (dealCardsButton) dealCardsButton.disabled = false;
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