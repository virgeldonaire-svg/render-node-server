const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Connect to MongoDB
const dbURL = process.env.MONGODB_URI;
mongoose.connect(dbURL)
    .then(() => console.log("Connected to MongoDB!"))
    .catch(err => console.error("Connection error:", err));

// --- Schemas ---

const userSchema = new mongoose.Schema({
    firebaseUid: String,
    name: String,
    email: String,
    phoneNumber: String,
    password: String,  
    accountType: String,        
    reviewsCount: { type: Number, default: 0 },
    status: String, 
    otp: String,
    otpExpires: Date
});

const reservationsSchema = new mongoose.Schema({
    business_name: String,
    user_name: String,
    uid: String, // User's Firebase UID
    reservation_date: String,
    reservation_time: String,
    number_of_guest: Number,
    special_request: String,
    status: { type: String, default: 'Pending' },
    estimated_price: String
});

const spotSchema = new mongoose.Schema({
    name: String,
    location: String,
    description: String,
    image: String,
    latitude: Number,
    longitude: Number,
    opening_hours: [String]
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

const BusinessSchema = new mongoose.Schema({
    owner_name: String,
    firebaseUid: String, // Owner's Firebase UID
    business_name: String,
    photo_logo: String,
    photos: [String],
    location: String,
    latitude: String,
    longitude: String,
    service: [String],
    opening_hours: [String],
    type_of_business: String,
    description: String,
    document: String,
    status: { type: String, default: 'Pending' },
    stars: { type: Number, default: 0 }, 
    reviews_count: { type: Number, default: 0 }
});

const reviewSchema = new mongoose.Schema({
    business_name: String,
    user_name: String,
    user_uid: String,
    review_date: String,
    rating: Number,
    comment: String,
    status: { type: String, default: 'approved' }
});

// --- Models ---
const User = mongoose.model('User', userSchema);
const Reservation = mongoose.model("Reservations", reservationsSchema);
const Spot = mongoose.model("Spot", spotSchema);
const TravelPlan = mongoose.model("Travel Plan", travelPlanSchema);
const Business = mongoose.model("Business", BusinessSchema);
const Review = mongoose.model("Review", reviewSchema);

// --- Auth Routes ---

app.post('/signup', async (req, res) => {
    try {
        const { uid, name, email, phoneNumber, password, accountType } = req.body;
        const status = (accountType === "business owner") ? "pending" : "approved";
        const newUser = new User({
            firebaseUid: uid,
            name, email, phoneNumber, password, accountType, status
        });
        await newUser.save();
        res.status(201).json({ status: "success", message: "User created" });
    } catch (error) {
        res.status(500).json({ message: "Failed to save user" });
    }
});

app.post('/signIn', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ $or: [{ email: email }, { phoneNumber: email }] });
        if (!user) return res.status(404).json({ status: "error", message: "User not found" });
        
        res.status(200).json({
            status: "success",
            userData: {
                name: user.name,
                email: user.email,
                accountType: user.accountType,
                reviews: user.reviewsCount || 0,
                status: user.status,
                uid: user.firebaseUid
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// --- Business & Spots ---

app.get('/businesses', async (req, res) => {
    try {
        const businesses = await Business.find(); 
        res.json(businesses);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/business_by_uid', async (req, res) => {
    try {
        const { uid } = req.query;
        const business = await Business.findOne({ firebaseUid: uid });
        if (business) res.status(200).json(business);
        else res.status(404).json({ message: "Not found" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

app.post('/register_business', async (req, res) => {
    try {
        const newBusiness = new Business(req.body);
        await newBusiness.save();
        res.status(201).json({ message: "Success" });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

// --- Reservations ---

// For Business Owners to see their bookings
app.get('/business_reservations', async (req, res) => {
    try {
        const { business_name } = req.query;
        if (!business_name) return res.status(400).send("Name required");
        
        // Use a simple find. Regex is only needed if there are trailing spaces.
        const data = await Reservation.find({ business_name: business_name.trim() });
        res.json(data);
    } catch (error) {
        res.status(500).send("Error");
    }
});

// For Tourists to see their own bookings
app.get('/user_reservations', async (req, res) => {
    try {
        const { uid } = req.query;
        const data = await Reservation.find({ uid: uid });
        res.json(data);
    } catch (error) {
        res.status(500).send("Error");
    }
});

app.post('/reservations', async (req, res) => {
    try {
        const newReservation = new Reservation(req.body);
        await newReservation.save();
        res.status(201).send("Created");
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

app.post('/update_reservation_status', async (req, res) => {
    try {
        const { id, status } = req.body;
        await Reservation.findByIdAndUpdate(id, { status: status });
        res.status(200).send("Updated");
    } catch (error) {
        res.status(500).send("Error");
    }
});

// --- Reviews ---

app.get('/reviews', async (req, res) => {
    try {
        const reviews = await Review.find();
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// For Business Owners to see reviews for their specific business
app.get('/business_reviews', async (req, res) => {
    try {
        const { owner_uid } = req.query;
        const business = await Business.findOne({ firebaseUid: owner_uid });
        if (!business) return res.status(404).send("Business not found");

        const reviews = await Review.find({ 
            business_name: business.business_name,
            status: { $ne: "reported" } 
        });
        res.json(reviews);
    } catch (error) {
        res.status(500).send("Server Error");
    }
});

app.post('/create_review', async (req, res) => {
    try {
        const newReview = new Review(req.body);
        await newReview.save();
        
        // Increment review count on user profile
        await User.findOneAndUpdate(
            { firebaseUid: req.body.user_uid }, 
            { $inc: { reviewsCount: 1 } }
        );

        res.status(201).json({ message: "Review posted" });
    } catch (error) {
        res.status(500).send("Error");
    }
});

app.post('/update_review_status', async (req, res) => {
    try {
        const { id, status } = req.body;
        await Review.findByIdAndUpdate(id, { status: status });
        res.status(200).send("Updated");
    } catch (error) {
        res.status(500).send("Error");
    }
});

// --- Admin & Utils ---

app.get('/users', async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

// quickref
// git add server.js 
// git commit -m "
// git push origin main