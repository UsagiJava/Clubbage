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
const PLAYER_NAMES = ['Player 1 Deck', 'Player 2 Deck']; // Display Names Of Characters For Game UI Placeholder.

let gameState = {
    running: false,
    decks: {},
    currentPlayer: 0,
    round: 0
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
                score: 0
            },
            player2Deck: {
                name: PLAYER_NAMES[1],
                deck: new Deck('deck_id_player2Deck', DECK_PLAYER_SIZE, SUITS, RANKS),
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

        // disable start button and enable shuffle/deal buttons
        document.getElementById('btn_main_start').disabled = true;
        document.getElementById('btn_main_start').classList.add('d-none');
        document.getElementById('btn_main_shuffle').disabled = false;
        document.getElementById('btn_main_sort_suit').disabled = false;
        document.getElementById('btn_main_sort_value').disabled = false;
        document.getElementById('btn_main_deal_cards').disabled = false;
    }
}

// function to handle when a mouse click event occurs on a card element, which will log the card's details to the console for debugging purposes.
function onCardClick(event) {
    const cardElement = event.currentTarget;
    cardElement.classList.toggle('selected');

    const cardId = cardElement.dataset.cardId;
    const deckId = cardElement.dataset.deckId;

    // get the btn_<deckId>_send button element and enable it if at least one card is selected, otherwise disable it.
    const sendButton = document.getElementById(cardElement.dataset.sendBtnId);
    if (sendButton) {
        const selectedCards = document.querySelectorAll(`.game_card.selected[data-deck-id="${deckId}"]`);
        sendButton.disabled = selectedCards.length === 0;
    }
    console.log(`Card ID: ${cardId}, Deck ID: ${deckId}`);
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
        cardDiv.innerHTML = `<div class="game_card_rank">${card.rank}</div><i class="bi ${suitIconClass}" aria-label="${card.suit}"></i>`;
        cardDiv.addEventListener('click', onCardClick);
        location.appendChild(cardDiv);
    }
}

function shuffleDeck(locationID, deckName) {
    gameState.decks[deckName].deck.shuffle();
    showDeck(locationID, gameState.decks[deckName].deck);
}

function sortDeck(locationID, deckName, sortType) {
    gameState.decks[deckName].deck.sort(sortType);
    showDeck(locationID, gameState.decks[deckName].deck);
}

function dealToPlayers() {
    const mainDeck = gameState.decks.mainDeck.deck;
    const player1Deck = gameState.decks.player1Deck.deck;
    const player2Deck = gameState.decks.player2Deck.deck;
    mainDeck.deal([player1Deck, player2Deck], [DECK_PLAYER_SIZE, DECK_PLAYER_SIZE], 'top');
    showDeck('deck_id_mainDeck', mainDeck);
    showDeck('deck_id_player1Deck', player1Deck);
    showDeck('deck_id_player2Deck', player2Deck);
    console.log("Dealt cards to players. Current game state:", gameState);
    // enable shuffle/sort/return buttons
    document.getElementById('btn_player1_shuffle').disabled = false;
    document.getElementById('btn_player1_sort_suit').disabled = false;
    document.getElementById('btn_player1_sort_value').disabled = false;
    document.getElementById('btn_player1_return_cards').disabled = false;
    document.getElementById('btn_player2_shuffle').disabled = false;
    document.getElementById('btn_player2_sort_suit').disabled = false;
    document.getElementById('btn_player2_sort_value').disabled = false;
    document.getElementById('btn_player2_return_cards').disabled = false;
    document.getElementById('btn_play_return_cards').disabled = false;
}

function sendCards(fromDeckName, toDeckName, numCards = null) {
    const fromDeck = gameState.decks[fromDeckName].deck;
    const toDeck = gameState.decks[toDeckName].deck;
    const cardsToSend = (numCards !== null) ? numCards : fromDeck.getCards().length;
    fromDeck.deal([toDeck], [cardsToSend], 'top');
    // disable shuffle/sort/return buttons
    if (fromDeckName === 'player1Deck') {
        document.getElementById('btn_player1_shuffle').disabled = true;
        document.getElementById('btn_player1_sort_suit').disabled = true;
        document.getElementById('btn_player1_sort_value').disabled = true;
        document.getElementById('btn_player1_return_cards').disabled = true;
    } else if (fromDeckName === 'player2Deck') {
        document.getElementById('btn_player2_shuffle').disabled = true;
        document.getElementById('btn_player2_sort_suit').disabled = true;
        document.getElementById('btn_player2_sort_value').disabled = true;
        document.getElementById('btn_player2_return_cards').disabled = true;
    }
    showDeck(fromDeckName === 'player1Deck' ? 'deck_id_player1Deck' : 'deck_id_player2Deck', fromDeck);
    showDeck('deck_id_mainDeck', gameState.decks.mainDeck.deck);
}

window.initGame = initGame;
window.shuffleDeck = shuffleDeck;
window.sortDeck = sortDeck;
window.dealToPlayers = dealToPlayers;
window.sendCards = sendCards;