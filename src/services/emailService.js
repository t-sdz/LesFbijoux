const nodemailer = require('nodemailer');

function createTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}

async function sendOrderConfirmation(email, items) {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
        console.warn('SMTP non configuré — email de confirmation ignoré.');
        return;
    }

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const itemsHtml = items.map(item => `
        <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #e0d8cc;">${item.name}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e0d8cc;text-align:center;">${item.quantity}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e0d8cc;text-align:right;">${(item.price * item.quantity).toFixed(2)} €</td>
        </tr>
    `).join('');

    const html = `
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;color:#1f1a14;">
            <h1 style="font-family:'Playfair Display',serif;color:#9a6f2e;text-align:center;">LesFbijoux</h1>
            <h2 style="font-weight:400;">Confirmation de votre commande</h2>
            <p>Merci pour votre commande. Voici le récapitulatif :</p>
            <table style="width:100%;border-collapse:collapse;margin:20px 0;">
                <thead>
                    <tr style="background:#f9f6f1;">
                        <th style="padding:8px 12px;text-align:left;">Produit</th>
                        <th style="padding:8px 12px;text-align:center;">Qté</th>
                        <th style="padding:8px 12px;text-align:right;">Montant</th>
                    </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
                <tfoot>
                    <tr>
                        <td colspan="2" style="padding:12px;font-weight:600;">Total</td>
                        <td style="padding:12px;text-align:right;font-weight:600;color:#9a6f2e;">${total.toFixed(2)} €</td>
                    </tr>
                </tfoot>
            </table>
            <p style="color:#7a7068;font-size:0.9em;">Votre commande sera traitée dans les plus brefs délais.</p>
            <hr style="border:none;border-top:1px solid #e0d8cc;margin:24px 0;">
            <p style="color:#7a7068;font-size:0.8em;text-align:center;">LesFbijoux — Bijoux artisanaux</p>
        </div>
    `;

    const transporter = createTransporter();
    await transporter.sendMail({
        from: process.env.SMTP_FROM || 'LesFbijoux <noreply@lesfbijoux.fr>',
        to: email,
        subject: 'Confirmation de votre commande — LesFbijoux',
        html,
    });
}

module.exports = { sendOrderConfirmation };
