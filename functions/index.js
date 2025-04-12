const nodemailer = require('nodemailer');
const { google } = require('googleapis');

const OAuth2 = google.auth.OAuth2;

// OAuth2 credentials
const oauth2Client = new OAuth2(
    '178270446013-fqr5nh4ec3vav206o2m8djmhe3nn24mp.apps.googleusercontent.com',    // Your OAuth2 Client ID
    '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', // Your OAuth2 Client Secret
    'https://developers.google.com/oauthplayground'  // Redirect URI (you can use the OAuth2 Playground for testing)
);

oauth2Client.setCredentials({
    refresh_token: '1//04HUJVf8_6QttCgYIARAAGAQSNwF-L9IrkM9JfHG46EnnQiwGUhbqU-z6LyR3JZc58mG4f6tC04IWJIYkji4HjDWnBwRYt1O3YYA' // The refresh token you obtained
});

// Function to get the access token
async function getAccessToken() {
    const accessToken = await oauth2Client.getAccessToken();
    return accessToken.token;  // Corrected: accessToken is an object containing the token
}

// Function to send the email
async function sendSignUpNotification(userEmail) {
    const accessToken = await getAccessToken();

    // Set up Nodemailer with OAuth2
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            type: 'OAuth2',
            user: 'murk8619@gmail.com', // Your Gmail address
            clientId: '178270446013-fqr5nh4ec3vav206o2m8djmhe3nn24mp.apps.googleusercontent.com',
            clientSecret: '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',
            refreshToken: '1//04HUJVf8_6QttCgYIARAAGAQSNwF-L9IrkM9JfHG46EnnQiwGUhbqU-z6LyR3JZc58mG4f6tC04IWJIYkji4HjDWnBwRYt1O3YYA',
            accessToken: accessToken,
        },
    });

    // Email options (send a notification when someone signs up)
    const mailOptions = {
        from: 'murk8619@gmail.com',
        to: 'admin@tabletopreserve.com', 
        subject: 'New User Sign Up',
        text: `A new user has signed up on your website. Their email is: ${userEmail}`,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.response);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

// Example usage when a new user signs up
sendSignUpNotification('new-user@example.com');
