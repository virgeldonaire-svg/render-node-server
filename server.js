const express = require('express');
const mongoose = require('mongoose');const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const app = express();
const PORT = process.env.PORT || 3000;
app.use(bodyParser.json());

// Connect to MongoDB
const dbURL = process.env.MONGODB_URI;
mongoose.connect(dbURL)
    .then(() => console.log("Connected to MongoDB!"))
    .catch(err => console.error("Connection error:", err));

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure:true,
    auth: {
        user: 'gachagambler777@gmail.com',
        pass: 'oxthqplwryyyxliq'
    }
});

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,  
    accountType: String,        
    reviewsCount: Number,
    status: String, 
    otp: String,
    otpExpires: Date
});

const AccommodationsSchema = new mongoose.Schema({
    business_name: String,
    location: String,
    stars: String,
    category: String,
    description: String,
    image: String
});

const spotSchema = new mongoose.Schema({
    name: String,
    location: String,
    description: String,
    image: String,
    latitude: Number,
    longitude: Number
});

const travelPlanSchema = new mongoose.Schema({
    email: String,
    name: String,
    location: String,
    type: String,
    date: String,
    time: String,
    status: String
});

const reviewsSchema = new mongoose.Schema({
    name: String,
    location: String,
    description: String,
    image: String
});

const User = mongoose.model('User', userSchema);

const Accommodations = mongoose.model("Accommodations", AccommodationsSchema);

const Spot = mongoose.model("Spot", spotSchema);

const travelPlan = mongoose.model("Travel Plan", travelPlanSchema);

const Reviews = mongoose.model("Reviews", reviewsSchema);

// Signin Endpoint 
app.post('/signin', async (req, res) => {
    console.log("attemp login body:", req.body)
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email: email, password: password });
        if (user) {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            user.otp = otp;
            user.otpExpires = Date.now() + 300000
            await user.save();

            const mailOptions = {
                from: '"CaviteKonek Admin" <gachagambler777@gmail.com>',
                to: user.email, 
                subject: 'Login Verification Code',
                text: 'Your verification code is: ${otp}'
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log("Email error: ", error);
                } else { 
                    console.log("Email sent to your email: ", info.response);
                }
            });
            res.json({
                status: "2fa-required",
                message: "Please check the 2fa code to your email",
                email: user.email
                });
        } else {
            res.status(401).json({ status: "error", message: "Invalid credentials" });
        }
    } catch (err) {
        res.status(500).json({ status: "error", message: "Server error" });
    }
});

app.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;

    try {const user = await User.findOne({
        email: email,
        otp: otp,
        otpExpires: {$gt: Date.now()}
    });
        if (user) {
            user.otp = null
            user.otpExpires = null;
            await user.save();

            res.json({
                status: "success",
                userData: {
                    name: user.name,
                    email: user.email,
                    reviews: user.reviewsCount,
                    accountType: user.accountType,
                    status: user.status
                }
            });
        } else {
            res.status(400).json({ status: "error", message: "Invalid or the OTP expired"});
        }
        } catch (err) {
            res.status(500).json({ status: "error", message: "Server error"})
    }
});

app.post('/signup', async (req, res) => {
    try {
        const { name, email, password, accountType } = req.body;

        const status = (accountType === "business owner") ? "pending" : "approved";
        const newUser = new User ({
            name: name,
            email: email,
            password: password,
            accountType: accountType,
            reviewsCount: 0,
            status: status
        });
        
        await newUser.save();
        console.log("User created: ", name);
        res.status(201).json({
            status: "success",
            message: "User created successfully",
            token: "first account"
        });
    } catch (error) {
        console.error("Signup error: ", error);
        res.status(500).json({ message: "Failed to save user" });
    }
});

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

app.post('/createTravelPlan', async (req, res) => {
    try {
        const {email, name, location, date, time, status} = req.body;

        const newtravelPlan = new travelPlan({
            //phoneNumber is included to link it to a specific account
            email: email,
            name: name,
            location: location,
            type: type,
            date: date,
            time: time,
            status: status
        });
    } catch (error) {
        console.error("Error fetchin Travel plans", error);
    }
});

app.get('/travelPlans', async (req, res) => {
    try {
        const plans = await travelPlan.find();
        res.json(plans);
        console.log("travel plan is sent to the user");
    } catch (error) {
        console.error("Error fetching travel plans", error);
        res.status(500).json({ message: "Server error"});
    }
});

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

app.post('/create_reviews', async (req, res) => {
    try{
        const{name, star, review_date, business_name, review_text, status} = req.body;

        const newReview = new Reviews({
            name,
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

app.get('/accommodation', async (req, res) => {
    try {
        const accommodations = await Accommodations.find();
        res.json(accommodations);
        console.log("accommodation succesfully sent to the tourist");
    }  catch (error) {
        console.log("There is an error in server fetching",  error);
        res.status(500).json({message: "server errror"});
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});

// git add . 
// git commit -m "name of the update"
// git push origin main