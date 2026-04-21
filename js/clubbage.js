import { Deck } from './Deck.js';

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const DECK_MAIN_SIZE = 52;
const DECK_CRIB_SIZE = 4;
const DECK_PLAY_SIZE = 8;
const DECK_PLAYER_SIZE = 6;
const MAIN_NAME = ['Main Deck'];
const CRIB_NAME = ['Crib Deck'];
const PLAY_NAME = ['Play Deck'];
const PLAYER_NAMES = ['Player 1', 'Player 2']; // Display Names Of Characters For Game UI Placeholder.

let gameState = {
    running: false,
    decks: {},
    currentPlayer: 0,
    round: 0,
    cribOwner: 0
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
                score: 0
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
                corner: '#F08080'
            },
            player2Deck: {
                name: PLAYER_NAMES[1],
                deck: new Deck('deck_id_player2Deck', DECK_PLAYER_SIZE, SUITS, RANKS),
                score: 0,
                corner: '#4169E1'
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

function runGame() {

    addCommentaryEntry('Clubbage Game Started.', 'game_success');

    cornerSelection();

    while(gameState.round < 1) {
        addCommentaryEntry('Shuffling Deck.', 'game_info');
        shuffleDeck('deck_id_mainDeck', 'mainDeck');

        addCommentaryEntry('Dealing cards to Fighters.', 'game_info');
        dealToPlayers();

        gameState.round++;
        addCommentaryEntry(['Round ', { text: gameState.round }, '. ', { text: 'FIGHT!', bold: true, color: '#FF4500' }], 'game_info');

        // test how the commentary section looks for various attacks.
        addCommentaryEntry([{ text: gameState.decks.player1Deck.name, italic: true, color: gameState.decks.player1Deck.corner }, ' hits a ', { text: 'jab', bold: true }, ' on ', { text: gameState.decks.player2Deck.name, italic: true, color: gameState.decks.player2Deck.corner }, ' for ', { text: '2 damage', underline: true }, '. [a pair]'], 'game_action');
        addCommentaryEntry([{ text: gameState.decks.player2Deck.name, italic: true, color: gameState.decks.player2Deck.corner }, ' delivers a ', { text: 'hook', bold: true }, ' to ', { text: gameState.decks.player1Deck.name, italic: true, color: gameState.decks.player1Deck.corner }, ' for ', { text: '4 damage', underline: true }, '. [flush of four]'], 'game_action');
        addCommentaryEntry([{ text: gameState.decks.player1Deck.name, italic: true, color: gameState.decks.player1Deck.corner }, ' sends an ', { text: 'uppercut', bold: true }, ' to ', { text: gameState.decks.player2Deck.name, italic: true, color: gameState.decks.player2Deck.corner }, ' for ', { text: '6 damage', underline: true }, '. [three of a kind]'], 'game_action');
    }

}

// A coin is flipped at the start of a fight to determine which corner a player will get. If the Player guesses correctly, they will get the red/home corner. This means they'll start as "dealer" and gets the first crib.
function cornerSelection() {
    if (Math.random() < 0.5) {
        gameState.decks.player1Deck.corner = '#F08080';
        gameState.decks.player2Deck.corner = '#4169E1';
        addCommentaryEntry(['Flipping Coin...', { text: gameState.decks.player1Deck.name, italic: true, color: gameState.decks.player1Deck.corner }, ' won the coin flip and will take the ', { text: 'red', color: gameState.decks.player1Deck.corner }, ' corner! [', { text: gameState.decks.player1Deck.name, italic: true, color: gameState.decks.player1Deck.corner }, ' gets first crib]'], 'game_success');
    } else {
        gameState.decks.player1Deck.corner = '#4169E1';
        gameState.decks.player2Deck.corner = '#F08080';
        addCommentaryEntry(['Flipping Coin...', { text: gameState.decks.player1Deck.name, italic: true, color: gameState.decks.player1Deck.corner }, ' lost the coin flip and will take the ', { text: 'blue', color: gameState.decks.player1Deck.corner }, ' corner. [', { text: gameState.decks.player2Deck.name, italic: true, color: gameState.decks.player2Deck.corner }, ' gets first crib]'], 'game_success');
    }
}

// function to handle when a mouse click event occurs on a card element to toggle a "selected" highlighting class.
function onCardClick(event) {
    event.currentTarget.classList.toggle('selected');
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
        console.log(`Refreshing deck ${deckKey}. Card count: ${deckInfo.deck.getCardCount()}`);
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

function sendCards(fromDeckName, toDeckName, numCards = null, specificCards = false) {
    const fromDeck = gameState.decks[fromDeckName].deck;
    const toDeck = gameState.decks[toDeckName].deck;
    let cardsToSend = (numCards !== null) ? numCards : fromDeck.getCards().length;
    // pass specific selected cards or deal a number of cards from the top of the fromDeck to the toDeck.
    if (specificCards) {
        cardsToSend = Array.from(document.querySelectorAll(`.game_card.selected[data-deck-id="${fromDeck.id}"]`)).map(cardElement => {
            const cardId = cardElement.dataset.cardId;
            return fromDeck.getCards().find(card => card.id === cardId);
        });
        console.log(`Specific cards selected to send from ${fromDeckName} to ${toDeckName}:`, cardsToSend);
        fromDeck.pass(toDeck, cardsToSend);
    } else {
        fromDeck.deal([toDeck], [cardsToSend], 'top');
    }
    refreshDecks();
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