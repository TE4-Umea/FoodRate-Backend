console.log("\n---------------[ FoodRate Server ]---------------\n");



const config = require("./config");
const express = require("express");
const firebase = require("firebase");
require("firebase/firestore");

const app = express();
app.listen(config.server.port, () => console.log(`Listening on port: ${config.server.port}`));

firebase.initializeApp(config.firebase);

const db = firebase.firestore();


/**
 * 
 * @param {String} collection 
 */
function getCollection(collection) {
    return new Promise(resolve => {
        db.collection(collection).get().then(querySnapshot => {
            let result = [];
            querySnapshot.forEach(doc => {
                let document = doc.data();
                document['id'] = doc.id;
                result.push(document);
            });
            resolve(result)
        });
    });
}

/**
 * @param {String} collection
 * @param {String} field
 * @param {*} value
 */
function getDocsByFieldValue(collection, field, value) {
    return new Promise(resolve => {
        db.collection(collection).where(field, "==", value).get().then(querySnapshot => {
            let result = [];
            querySnapshot.forEach(doc => {
                let document = doc.data();
                document['id'] = doc.id;
                result.push(document);
            });
            resolve(result)
        });
    });
}

getUserByAppId = async (appId) => {
    let users = await getDocsByFieldValue("users", "app_id", appId);
    return users[0];
}

getLatestRatingByUserId = async (userId) => {
    let userRatings = await getDocsByFieldValue("ratings", "author_id", userId);
    let latestRating = userRatings.sort((a, b) => (a.timestamp.seconds < b.timestamp.seconds) ? 1 : -1)[0];
    return latestRating;
}

getFoodMenuByWeek = async (week) => {
    let foodMenu = await getDocsByFieldValue("foodMenu", "week", week);
    return foodMenu;
}


app.post('/rate', async (req, res) => {
    console.log(`[rate]`, req.query);

    let user = await getUserByAppId(req.query.app_id)
    let rateEvent = {
        author_id: user.id,
        timestamp: new Date(),
        rating: req.query.rating,
    };

    if (req.comment) rateEvent.comment = req.comment

    console.log(rateEvent);

    db.collection("ratings").add(rateEvent);

    let response = new SuccessResponse("Rating Successful");
    res.send(response);
});

app.post('/comment', async (req, res) => {
    console.log(`/comment`, req.query);
    let user = await getUserByAppId(req.query.app_id)
    let latestRating = await getLatestRatingByUserId(user.id)

    let updatedRating = {
        author_id: latestRating.author_id,
        rating: latestRating.rating,
        timestamp: latestRating.timestamp,
        comment: req.query.comment
    }

    console.log("Updated Rating", updatedRating);

    db.collection("ratings").doc(latestRating.id).set(updatedRating);

    let response = new SuccessResponse(res, "")
    res.send(response);
});

app.get('/fetch_menu', async (req, res) => {
    console.log(`[fetch_menu]`, req.query);
    let foodMenu = await getFoodMenuByWeek(JSON.parse(req.query.week));

    console.log(foodMenu);

    res.send(foodMenu);
});

app.post('/user_register', (req, res) => {
    console.log(`[user_register]`, req.query);
    res.send('nice');
});

app.post('/generate_key', (req, res) => {
    console.log(`[generate_key]`, req.query);
    res.send('nice');
});

let adminToken = "test";

app.get('/admin_fetch_data', async (req, res) => {
    console.log(`[admin_fetch_data]`, req.query);
    let data
    if (req.query.admin_key = adminToken) {

        let users = await getCollection("users");
        let ratings = await getCollection("ratings");
        let comments = await getCollection("comments");
        let foodMenu = await getCollection("foodMenu");
        data = {
            users: users,
            ratings: ratings,
            comments: comments,
            foodMenu: foodMenu
        }

        new SuccessResponse(res, "Data fetch successful", data);
    } else {
        new ErrorResponse(res, "Invalid admin key");
    }

    //res.send(response);
})

sendSuccessResponse = () => {



    res.send(successResponse);
}

class Response {
    constructor(res, message, status, params) {
        this.message = message;
        this.status = status;
        for (let property in params) this[property] = params[property];
        res.send(this);
    }
}

class SuccessResponse extends Response {
    constructor(res, message, params) {
        super(res, message, "success", params);
    }
}


class ErrorResponse extends Response {
    constructor(res, message, params) {
        super(res, message, "error", params);
    }
}