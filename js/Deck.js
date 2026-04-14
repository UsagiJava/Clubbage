class Deck {

    // The order of the suits and ranks arrays defines both iteration and sort order.
    constructor(maxSize = 52, suits = ['hearts', 'diamonds', 'clubs', 'spades'], ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']) {
        this.cards = [];
        this.maxSize = maxSize;
        this.suits = [...suits]; // Create copy of the suits array to prevent external mutation.
        this.ranks = [...ranks]; // Create copy of the ranks array to prevent external mutation.

        // create a suitOrder object that maps each suit to its index in the suits array. IE: { hearts: 0, diamonds: 1, clubs: 2, spades: 3 }
        this.suitOrder = {};
        this.suits.forEach((suit, index) => {
            this.suitOrder[suit] = index;
        });

        // create a rankOrder object that maps each rank to its index in the ranks array. IE: { A: 0, '2': 1, '3': 2, ..., J: 10, Q: 11, K: 12 }
        this.rankOrder = {};
        this.ranks.forEach((rank, index) => {
            this.rankOrder[rank] = index;
        });
    }

    getCardCount() {
        return this.cards.length;
    }

    isFull() {
        return this.getCardCount() >= this.maxSize;
    }

    addCard(card) {
        if (this.isFull()) {
            console.warn(`Cannot add card. Deck is full (${this.getCardCount()}/${this.maxSize})`);
            return false;
        }
        this.cards.push(card);
        return true;
    }

    removeCard(card, targetDeck) {
        const cardIndex = this.cards.findIndex(c => c.id === card.id);

        if (cardIndex === -1) {
            console.warn(`Card ${card.id} not found in deck`);
            return false;
        }

        if (targetDeck.isFull()) {
            console.warn(`Cannot move card to target deck. Target deck is full (${targetDeck.getCardCount()}/${targetDeck.maxSize})`);
            return false;
        }

        const removedCard = this.cards.splice(cardIndex, 1)[0];
        targetDeck.addCard(removedCard);
        return true;
    }

    drawCard(targetDeck) {
        if (this.getCardCount() === 0) {
            console.warn('Cannot draw card. Deck is empty');
            return false;
        }

        const cardToDraw = this.cards[this.cards.length - 1];
        return this.removeCard(cardToDraw, targetDeck);
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {                    // start i at the last index of the cards array and work its way down to 1 (which may swap with 0).
            const j = Math.floor(Math.random() * (i + 1));                   // generate j; a random number from 0 to i.
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]]; // swap the card at index i with j and the card at index j with i.
        }
    }

    // sort the deck by suit, value, or by suit and value.
    sort(sortType = 'suit-value') {
        switch (sortType.toLowerCase()) {
            case 'suit':
                this.cards.sort((a, b) => this.suitOrder[a.suit] - this.suitOrder[b.suit]);
                break;
            case 'value':
                this.cards.sort((a, b) => this.rankOrder[a.rank] - this.rankOrder[b.rank]);
                break;
            case 'suit-value': default:
                this.cards.sort((a, b) => {
                    const suitDiff = this.suitOrder[a.suit] - this.suitOrder[b.suit];
                    if (suitDiff !== 0) {
                        return suitDiff;
                    }
                    return this.rankOrder[a.rank] - this.rankOrder[b.rank];
                });
                break;
        }
    }

    getCards() {
        return this.cards;
    }

    clear() {
        this.cards = [];
    }
}

export { Deck };