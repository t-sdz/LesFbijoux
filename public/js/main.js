// Charger les produits depuis l'API
async function loadProducts() {
    try {
        const response = await fetch('/products');
        const products = await response.json();

        const container = document.getElementById('product-list');
        container.innerHTML = '';

        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';

            card.innerHTML = `
                <img src="../images/${product.image}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p>${product.price} €</p>
                <button onclick="addToCart(${product.id})">Ajouter au panier</button>
            `;

            container.appendChild(card);
        });

    } catch (error) {
        console.error('Erreur chargement produits :', error);
    }
}

// Ajouter un produit au panier
async function addToCart(productId) {
    try {
        const response = await fetch('/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: productId })
        });

        const result = await response.json();

        if (result.error) {
            alert("⚠️ " + result.error);
        } else {
            alert("🛒 " + result.message);
        }

    } catch (error) {
        console.error('Erreur ajout panier :', error);
    }
}

// Charger les produits au démarrage
loadProducts();

