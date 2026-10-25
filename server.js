const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Connect to MongoDB
const dbURL = process.env.MONGODB_URI;
mongoose.connect(dbURL)
    .then(() => console.log("Connected to MongoDB!"))
    .catch(err => console.error("Connection error:", err));

   
const userSchema = new mongoose.Schema({
    firebaseUid: String,
    name: String,
    email: String,
    phoneNumber: String,
    password: String,  
    accountType: String,        
    reviewsCount: Number,
    status: String, 
    otp: String,
    otpExpires: Date
});

const reservationsSchema = new mongoose.Schema({
    business_name: String,
    user_name: String,
    uid: String,
    reservation_date: String,
    reservation_time: String,
    number_of_guest: Number,
    special_request: String,
    status: {type: String, default: 'Pending'},
    estimated_price: String
})

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
    firebaseUid: String,
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
    status: {type: String, default: 'Pending'},
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
    status: String
});

const User = mongoose.model('User', userSchema);

const reservations = mongoose.model("Reservations", reservationsSchema);

const Spot = mongoose.model("Spot", spotSchema);

const travelPlan = mongoose.model("Travel Plan", travelPlanSchema);

const Business = mongoose.model("Business", BusinessSchema);

const Review = mongoose.model("Review", reviewSchema);

app.post('/signup', async (req, res) => {
    try {
        const { uid, name, email, phoneNumber, password, accountType } = req.body;

        const status = (accountType === "business owner") ? "pending" : "approved";
        const newUser = new User ({
            firebaseUid: uid,
            name: name,
            email: email,
            phoneNumber: phoneNumber,
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

app.post('/signIn', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({
            $or: [
                { email: req.body.email },
                { phoneNumber: req.body.email } 
            ]
        });

        if (!user) {
            if (email.startWith(+63)) {
                const altPhone = "0" +email.substring(3);
                const altUser = await User.findOne({ phoneNumber: altPhone });
                if (altUser) {
                    return sendSuccessResponse(res, altUser);
                }
            }
            console.log("User not found for email: ", email);
            return res.status(404).json({ status: "error", message: "User not found"});
        }
        sendSuccessResponse(res, user);
    } catch (error) {
        console.error("Database fetch error:", error);
        res.status(500).json({ message: "Server error during profile fetch" });
    }
});
function sendSuccessResponse(res, user) {
    res.status(200).json({
        status: "success",
        userData: {
            name: user.name,
            email: user.email,
            accountType: user.accountType,
            reviews: user.reviewsCount || 0,
            status: user.status
        }
    });
}

app.post('/updateUser', async (req, res) => {
    try {
        // Match the field names coming from your Java Users class
        const { uid, username, phoneNumber, accountType } = req.body;

        const updatedUser = await User.findOneAndUpdate(
            { phoneNumber: phoneNumber }, 
            { 
                $set: { 
                    firebaseUid: uid, // make it match the uid in firebase
                    status: "approved", 
                    accountType: accountType 
                } 
            },
            { new: true } // return the it to the android app
        );

        if (updatedUser) {
            // Return the full user object the android will fetch it
            res.status(200).json(updatedUser); 
        } else {
            res.status(404).json({ message: "User not found in MongoDB" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
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
        const {email, name, location, type, date, time, status} = req.body;

        const newtravelPlan = new travelPlan({
            //phoneNumber is included to link it to a specific account
            email, name, location, type, date, time, status
        });
        await newtravelPlan.save();
        res.status(201).json({ status: "success" });
    } catch (error) {
        console.error("Error in creating Travel Plan", error);
        res.status(500).json({ message: "Server error" });
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
        const newSpot = new Spot(req.body);
        await newSpot.save();
        res.status(201).send();
    } catch (error) {
        console.error("Error creating spot",  error);
        res.status(500).json({ message: "Failed to create spot" });
    }
});

app.get('/accommodation', async (req, res) => {
    try {
        const business = await Business.find(); 
        res.json(business);
        console.log("Approved accommodations sent to the tourist");
    }  catch (error) {
        console.log("Error fetching accommodations", error);
        res.status(500).json({message: "server error"});
    }
});

app.post('/reservations', async (req, res) => {
    try {
        const{business_name, user_name, uid, reservation_date, reservation_time, number_of_guest, special_request, estimated_price} = req.body;

        const newReservation = new reservations({
            business_name,
            user_name,
            uid,
            reservation_date,
            reservation_time,
            number_of_guest,
            special_request,
            estimated_price
        });
        await newReservation.save();
        console.log("reservation sent waiting for response ", user_name);
        res.status(201).send();
    } catch (error) {
        console.log("There is an error in saving the reservation in database", error);
        res.status(500).json({message: "server errror"});
    }
});

app.post('/register_business', async (req, res) => {
    try {
        const newBusiness = new Business(req.body);
        await newBusiness.save();
        res.status(201).json({ message: "Business registration successfully"});
    } catch (error) {
        console.error(error);
        res.status(500).json({error: "server error"});
    }
});

// admin approvals 
app.post('/update_business_status', async (req, res) => {
    try {const { name, status } = req.query;
        // Find by name and update the status field
        await Business.findOneAndUpdate({ business_name: name }, { status: status });
        res.status(200).send("Status updated");
    } catch (error) {
        res.status(500).send("Error updating status");
    }
});

app.post('/create_review', async (req, res) => {
    try {
        const reviewData = req.body;
        if (!reviewData.status) {
            reviewData.status = "approved"; 
        }
        const newReview = new Review(reviewData);
        await newReview.save();
        res.status(201).json({ message: "review is posted" });
    } catch (error) {
        res.status(500).send("Error creating reviews");
    }
});

app.get('/reviews', async (req, res) => {
    try {
        const reviews = await Review.find(); 
        res.json(reviews);
    } catch (error) {
        console.error("Error fetching reviews:", error);
        res.status(500).json({ message: "server error" });
    }
});

app.get('/business_reviews', async (req, res) => {
    try {
        // find owner_uid match currently uid
        const { owner_uid } = req.query;
        const business = await Business.findOne({ firebaseUid: owner_uid });
        if (!business) return res.status(404).send("Not found");

        // then use that ui to find the business that have that uid as owner
        const reviews = await Review.find({ 
            business_name: business.business_name,
            status: { $ne: "reported" } // $ne means "Not Equal" to reported
        });
        res.json(reviews);
    } catch (error) {
        res.status(500).send("Server Error");
    }
});

app.post('/update_review_status', async (req, res) => {
    try {
        const { id, status } = req.body;
        // Find by MongoDB _id and update the status
        await Review.findByIdAndUpdate(id, { status: status });
        res.status(200).send("Review status updated");
    } catch (error) {
        res.status(500).send("Error updating review");
    }
});

// delete a review
app.delete('/delete_review/:id', async (req, res) => {
    try {
        await Review.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Review deleted permanently" });
    } catch (error) {
        res.status(500).send("Error deleting review");
    }
});

// restore the review to pending
app.post('/reject_report', async (req, res) => {
    try {
        const { id } = req.body;
        await Review.findByIdAndUpdate(id, { status: "approved" });
        res.status(200).json({ message: "Report rejected, review restored" });
    } catch (error) {
        res.status(500).send("Error restoring review");
    }
});

app.get('/business_reservations', async (req, res) => {
    try {
        const { business_name } = req.query;
        // Fetch all (Pending, Approved, Rejected) 
        const data = await reservations.find({ business_name: business_name });
        res.json(data);
    } catch (error) {
        res.status(500).send("Error fetching reservations");
    }
});

app.post('/update_reservation_status', async (req, res) => {
    try {
        const { id, status } = req.body;
        await reservations.findByIdAndUpdate(id, { status: status });
        res.status(200).send("Status updated");
    } catch (error) {
        res.status(500).send("Error updating status");
    }
});

app.get('/user_reservations', async (req, res) => {
    try {
        const { uid } = req.query;
        const data = await reservations.find({ uid: uid });
        res.json(data);
    } catch (error) {
        res.status(500).send("Error");
    }
});


app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});

// quickref
// git add server.js 
// git commit -m "
// git push origin main