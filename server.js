const express = require('express');
const mongoose = require('mongoose');const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Connect to MongoDB
const dbURL = process.env.MONGODB_URI;
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

const reviewsSchema = new mongoose.Schema({
    name: String,
    location: String,
    description: String,
    image: String
});
const Reviews = mongoose.model("Spot", spotSchema);

app.post('/create_reviews', async (req, res) => {
    try{
        const{user_name, star, review_date, business_name, review_text, status} = req.body;

        const newReview = new Reviews({
            user_name,
            stars,
            review_date,
            business_name,
            review_text,
            status: status || "pending"
        });

        await newReview.save();
        console.log("Review is for approval ", user_name);
        res.status(201).send();
    } catch (error) {
        console.error("Error creating reviews", error)
        res.status(500).json({message: "failed to create review"})
    }
});


app.get('/reviews', async (req, res) => {
    try{
        const reviews = await Reviews.find();
        res.json(reviews);
        console.log("spot sent to android");
    } catch (error) {
        console.error("Error fetchin reviews", error);
        res.status(500).json({message: "server error"});
    }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});