const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// Initialize Firebase Admin SDK
admin.initializeApp();

// Function that sends the email notification
async function sendSignUpNotification(storeData) {
    // Set up Nodemailer with App Password
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: functions.config().gmail.email,
            pass: functions.config().gmail.app_password
        }
    });

    // Create email content
    const mailOptions = {
        from: `Tabletop Reserve <${functions.config().gmail.email}>`,
        to: functions.config().admin.email, 
        subject: 'New Store Registration on Tabletop Reserve',
        html: `
            <h2>New Store Registration</h2>
            <p>A new store has registered on Tabletop Reserve:</p>
            <ul>
                <li><strong>Store Name:</strong> ${storeData.storeName || 'Not provided'}</li>
                <li><strong>Owner:</strong> ${storeData.ownerName || 'Not provided'}</li>
                <li><strong>Email:</strong> ${storeData.email || 'Not provided'}</li>
                <li><strong>Phone:</strong> ${storeData.phoneNumber || 'Not provided'}</li>
                <li><strong>Location:</strong> ${storeData.city || ''}, ${storeData.county || ''}</li>

            </ul>
            <p>Please review this registration in the admin dashboard.</p>
            <p>For more information, visit our website: <a href="https://www.tabletopreserve.com" target="_blank">Tabletop Reserve</a></p>
            <p>Thank you!</p>
            
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.response);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}

// Cloud function that triggers when a new store is created
exports.newStoreSignUp = functions.firestore
    .document('Stores/{storeId}')
    .onCreate(async (snapshot, context) => {
        const storeData = snapshot.data();
        
        try {
            // Send notification email with store details
            await sendSignUpNotification(storeData);
            console.log('Store registration notification sent successfully');
            return null;
        } catch (error) {
            console.error('Error sending store registration notification:', error);
            return null;
        }
    });