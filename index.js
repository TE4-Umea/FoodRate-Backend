console.log("\n---------------[ FoodRate Server ]---------------\n");



const config = require("./config");
const express = require("express");
const firebase = require("firebase");
require("firebase/firestore");

const app = express();
app.listen(config.server.port, () => console.log(`Listening on port: ${config.server.port}`));

firebase.initializeApp(config.firebase);

const db = firebase.firestore();

var serverCache = {
    users: []
}

getServerCache = () => {
    console.log(userCache);
}

updateCachedUsers = () => {
    let userCache = []
    db.collection("users").get().then(querySnapshot => {
        querySnapshot.forEach(doc => userCache.push(doc.data()));
    });
    serverCache.users = userCache;

    console.log(serverCache.users);
}

/**
 * @param {String} collection
 * @param {String} field
 * @param {*} value
 */
function getDocByFieldValue(collection, field, value) {
    return new Promise((resolve, reject) => {
        db.collection(collection).where(field, "==", value).get().then(querySnapshot => {
            querySnapshot.forEach(doc => resolve(doc.data()));
            resolve(null);
        });
    });
}

getUserByAppId = async (appId) => {
    //var user = await getDocByFieldValue("users", "app_id", appId);
    if (user === null) console.log("ERROR", "could not get user");
    return user;
}

class RateEvent {
    constructor(user, rating) {
        this.user = user;
        this.rating = rating;

        return this;
    }
}

app.post('/post_test', (req, res) => {
    console.log(`[post_test]`);
    updateCachedUsers();
    res.send('post_test_response');
})

app.post('/rate_event', async (req, res) => {
    console.log(`[rate_event]`);

    let rateEvent = new RateEvent(
        await getUserByAppId(req.query.app_id),
        req.query.rating
    );

    console.log(rateEvent)

    //db.collection("ratings").add(rateEvent);
    res.send('nice');
});

app.post('/comment_event', (req, res) => {
    console.log(`[comment_event]`);
    res.send('nice');
});

app.post('/user_register_event', (req, res) => {
    console.log(`[user_register_event]`);
    res.send('nice');
});

app.post('/generate_key_event', (req, res) => {
    console.log(`[generate_key_event]`);
    res.send('nice');
});

