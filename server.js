const express = require('express');
const mongoose = require('mongoose');const bodyParser = require('body-parser');
const app = express();
const PORT = 3000;

app.use(bodyParser.json());

// Connect to MongoDB
const dbURL = "mongodb://AdminVD_CaviteKonek:newAdminPass@ac-jgtoefh-shard-00-00.ytgcpwu.mongodb.net:27017,ac-jgtoefh-shard-00-01.ytgcpwu.mongodb.net:27017,ac-jgtoefh-shard-00-02.ytgcpwu.mongodb.net:27017/?ssl=true&replicaSet=atlas-msug2r-shard-0&authSource=admin&appName=CaviteKonekTest";

mongoose.connect(dbURL)
    .then(() => console.log("Connected to MongoDB!"))
    .catch(err => console.error("Connection error:", err));

// User Schema
const userSchema = new mongoose.Schema({
    name: String,
    phoneNumber: String,
    password: String,  
    accountType: String,        
    reviewsCount: Number,
    status: String
});

const User = mongoose.model('User', userSchema);

// Signin Endpoint
app.post('/signin', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ phoneNumber: username, password: password });
        if (user) {
            res.json({
                status: "success",
                message: "Welcome back!",
                userData: {
                    name: user.name,
                    phone: user.phoneNumber,
                    reviews: user.reviewsCount,
                    accountType: user.accountType,
                    status: user.status
                }
            });
        } else {
            res.status(401).json({ status: "error", message: "Invalid credentials" });
        }
    } catch (err) {
        res.status(500).json({ status: "error", message: "Server error" });
    }
});

// Signup Endpoint 
app.post('/signup', async (req, res) => {
    try {
        const { name, phoneNumber, password, accountType } = req.body;

        const status = (accountType === "business owner") ? "pending" : "approved";
        /**
         * this is a shortcut for if statement
         * let status
         * if (accountType === "business owner") {
         * status = "pending";
         * } else {
         * status = "approved";
         * }
        */

        const newUser = new User ({
            name: name,
            phoneNumber: phoneNumber,
            password: password,
            accountType: accountType,
            reviewsCount: 0,
            status: status
        });
        
        await newUser.save();
        console.log("User created: ", name);
        res.status(201).send(); 
    } catch (error) {
        console.error("Signup error: ", error);
        res.status(500).json({ message: "Failed to save user" });
    }
});

// getting user information for admin user management
app.get('/users', async (req, res) => {
    try {
        const users = await User.find();
        res.json(users)
        console.log("Users have been sent to the admin")
    } catch (error) {
        console.log("error in fetching users from database")
        res.status(500).json({message: "error at server"})
    }
});

const travelPlanSchema = new mongoose.Schema({
    phoneNumber: String,
    name: String,
    location: String,
    date: String,
    time: String,
    status: String
});
const travelPlan = mongoose.model("travelPlan", travelPlanSchema);
// Travel Plans Endpoint
// Create Travel Plans Endpoint
app.post('/createTravelPlan', async (req, res) => {
    try {
        const {phoneNumber, name, location, date, time, status} = req.body;

        const newtravelPlan = new travelPlan({
            //phoneNumber is included to link it to a specific account
            phoneNumber: phoneNumber,
            name: name,
            location: location,
            date: date,
            time: time,
            status: status
        });
    } catch (error) {
        console.error("Error fetchin Travel plans", error);
    }
});


const spotSchema = new mongoose.Schema({
    name: String,
    location: String,
    description: String,
    image: String
});
const Spot = mongoose.model("Spot", spotSchema);

// Spots Endpoint
app.get('/spots', async (req, res) => {
    try{
        const spots = await Spot.find();
        res.json(spots);
        console.log("spot sent to android");
    } catch (error) {
        console.error("Error fetchin spots", error);
        res.status(500).json({message: "server error"});
    }
});

// Create Spots Endpoint
app.post('/create_spots', async (req, res) => {
    try {
        const{ name, location, description, image } = req.body;

        const newSpot = new Spot({
            name: name,
            location: location,
            description: description,
            image: image
        });

        await newSpot.save();
        console.log("Spot created: ", name)
        res.status(201).send();
    } catch (error) {
        console.error("Error creating spot",  error);
        res.status(500).json({ message: "Failed to create spot" });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});