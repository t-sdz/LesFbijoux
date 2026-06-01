const express = require('express');
const { z } = require('zod');
const cartService = require('../services/cartService');
const authService = require('../services/authService');
const emailService = require('../services/emailService');

const router = express.Router();

const addToCartSchema = z.object({
    product_id: z.number({ coerce: true }).int().positive('product_id doit être un entier positif'),
});

function isAuthenticated(req, res, next) {
    if (!req.session.userId)
        return res.status(401).json({ error: 'Tu dois être connecté' });
    next();
}

router.get('/', isAuthenticated, async (req, res) => {
    try {
        res.json(await cartService.getCartByUser(req.session.userId));
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.post('/', isAuthenticated, async (req, res) => {
    const parsed = addToCartSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.errors[0].message });

    try {
        const action = await cartService.addOrIncrement(req.session.userId, parsed.data.product_id);
        const message = action === 'updated' ? 'Quantité mise à jour !' : 'Produit ajouté au panier !';
        res.json({ message });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.delete('/:id', isAuthenticated, async (req, res) => {
    try {
        await cartService.removeItem(req.params.id, req.session.userId);
        res.json({ message: 'Article supprimé du panier !' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.delete('/', isAuthenticated, async (req, res) => {
    try {
        await cartService.clearCart(req.session.userId);
        res.json({ message: 'Panier vidé !' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.post('/checkout', isAuthenticated, async (req, res) => {
    try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const items = await cartService.getItemsForCheckout(req.session.userId);

        if (items.length === 0)
            return res.status(400).json({ error: 'Panier vide' });

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: items.map(item => ({
                price_data: {
                    currency: 'eur',
                    product_data: { name: item.name },
                    unit_amount: Math.round(item.price * 100),
                },
                quantity: item.quantity,
            })),
            mode: 'payment',
            success_url: process.env.BASE_URL + '/confirmation.html?success=true',
            cancel_url: process.env.BASE_URL + '/cart.html?cancelled=true',
        });

        res.json({ url: session.url });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur paiement' });
    }
});

// Appelé depuis la page de confirmation après paiement réussi
router.post('/confirm-order', isAuthenticated, async (req, res) => {
    try {
        const user = await authService.findById(req.session.userId);
        const items = await cartService.getCartByUser(req.session.userId);

        await emailService.sendOrderConfirmation(user.email, items);
        await cartService.clearCart(req.session.userId);

        res.json({ message: 'Commande confirmée, email envoyé !' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur confirmation commande' });
    }
});

module.exports = router;
