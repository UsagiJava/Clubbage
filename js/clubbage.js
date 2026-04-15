import { Deck } from './Deck.js';

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const DECK_MAIN_SIZE = 52;
const DECK_CRIB_SIZE = 4;
const DECK_PLAYER_SIZE = 6;
const MAIN_NAME = ['Main Deck'];
const CRIB_NAME = ['Crib Deck'];
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
                deck: new Deck(DECK_MAIN_SIZE, SUITS, RANKS),
                score: 0
            },
            cribDeck: {
                name: CRIB_NAME[0],
                deck: new Deck(DECK_CRIB_SIZE, SUITS, RANKS),
                score: 0
            },
            player1Deck: {
                name: PLAYER_NAMES[0],
                deck: new Deck(DECK_PLAYER_SIZE, SUITS, RANKS),
                score: 0
            },
            player2Deck: {
                name: PLAYER_NAMES[1],
                deck: new Deck(DECK_PLAYER_SIZE, SUITS, RANKS),
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
        showDeck('main_deck', mainDeck);
        console.log("initGame() called, game state initialized:", gameState);

        // disable start button and enable shuffle/deal buttons
        document.getElementById('btn_main_start').disabled = true;
        document.getElementById('btn_main_shuffle').disabled = false;
        document.getElementById('btn_main_sort_suit').disabled = false;
        document.getElementById('btn_main_sort_value').disabled = false;
        document.getElementById('btn_main_deal').disabled = false;
    }
}

function showDeck(locationID, deck) {
    const location = document.getElementById(locationID);
    location.innerHTML = '';
    const cardsPerRow = 13;
    for (const card of deck.getCards()) {
        if (deck.getCards().indexOf(card) % cardsPerRow === 0 && deck.getCards().indexOf(card) !== 0) {
            location.appendChild(document.createElement('br'));
        }
        const cardDiv = document.createElement('div');
        cardDiv.className = 'game_card';
        cardDiv.setAttribute('title', `ID: ${card.id}\nPeg Value: ${card.pegValue}\nRun Value: ${card.runValue}\nSuit Order: ${deck.suitOrder[card.suit]}\nRank Order: ${deck.rankOrder[card.rank]}`);
        const suitIconClass = getSuitIconClass(card.suit);
        cardDiv.innerHTML = `<div class="game_card_rank">${card.rank}</div><i class="bi ${suitIconClass}" aria-label="${card.suit}"></i>`;
        location.appendChild(cardDiv);
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

function shuffleDeck(locationID, deckName) {
    const deckState = gameState.decks[deckName];
    if (!deckState) {
        console.warn(`Deck not found: ${deckName}`);
        return;
    }
    deckState.deck.shuffle();
    showDeck(locationID, deckState.deck);
}

function sortDeck(locationID, deckName, sortType) {
    const deckState = gameState.decks[deckName];
    if (!deckState) {
        console.warn(`Deck not found: ${deckName}`);
        return;
    }
    deckState.deck.sort(sortType);
    showDeck(locationID, deckState.deck);
}

function dealToPlayers() {
    const mainDeck = gameState.decks.mainDeck.deck;
    const player1Deck = gameState.decks.player1Deck.deck;
    const player2Deck = gameState.decks.player2Deck.deck;
    for (let i = 0; i < DECK_PLAYER_SIZE; i++) {
        mainDeck.drawCard(player1Deck);
        mainDeck.drawCard(player2Deck);
    }
    showDeck('main_deck', mainDeck);
    showDeck('player_1_deck', player1Deck);
    showDeck('player_2_deck', player2Deck);
    console.log("Dealt cards to players. Current game state:", gameState);
    // enable shuffle/sort/return buttons
    document.getElementById('btn_player1_shuffle').disabled = false;
    document.getElementById('btn_player1_sort_suit').disabled = false;
    document.getElementById('btn_player1_sort_value').disabled = false;
    document.getElementById('btn_player1_return').disabled = false;
    document.getElementById('btn_player2_shuffle').disabled = false;
    document.getElementById('btn_player2_sort_suit').disabled = false;
    document.getElementById('btn_player2_sort_value').disabled = false;
    document.getElementById('btn_player2_return').disabled = false;
}

function returnCards(fromDeckName, toDeckName) {
    const fromDeckState = gameState.decks[fromDeckName];
    const toDeckState = gameState.decks[toDeckName];
    if (!fromDeckState || !toDeckState) {
        console.warn(`Deck not found: ${fromDeckName} or ${toDeckName}`);
        return;
    }
    const fromDeck = fromDeckState.deck;
    const toDeck = toDeckState.deck;
    while (fromDeck.getCards().length > 0) {
        fromDeck.drawCard(toDeck);
    }

    // disable shuffle/sort/return buttons
    if (fromDeckName === 'player1Deck') {
        document.getElementById('btn_player1_shuffle').disabled = true;
        document.getElementById('btn_player1_sort_suit').disabled = true;
        document.getElementById('btn_player1_sort_value').disabled = true;
        document.getElementById('btn_player1_return').disabled = true;
    } else if (fromDeckName === 'player2Deck') {
        document.getElementById('btn_player2_shuffle').disabled = true;
        document.getElementById('btn_player2_sort_suit').disabled = true;
        document.getElementById('btn_player2_sort_value').disabled = true;
        document.getElementById('btn_player2_return').disabled = true;
    }

    showDeck(fromDeckName === 'player1Deck' ? 'player_1_deck' : 'player_2_deck', fromDeck);
    showDeck('main_deck', gameState.decks.mainDeck.deck);
}

window.initGame = initGame;
window.shuffleDeck = shuffleDeck;
window.sortDeck = sortDeck;
window.dealToPlayers = dealToPlayers;
window.returnCards = returnCards;