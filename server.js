require('dotenv').config(); // Load .env variables
const axios = require('axios');
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt'); // For password hashing

const app = express();
app.use(cors({
  origin: 'https://natekark.github.io/e-learning-platform/public/', // Replace with frontend URL
  credentials: true
}));

app.use(express.static('public'));
app.use(bodyParser.json());

// Set up session middleware
app.use(session({
  secret: process.env.SESSION_SECRET, // Use secret from .env
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: { secure: false }
}));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB connected...');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// User schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, match: /^\S+@\S+\.\S+$/ },
  password: { type: String, required: true },
  credits: { type: Number, default: 0 }, // Add credits field
  history: [
    {
      videoId: String,
      title: String,
      thumbnail: String,
      watchedAt: { type: Date, default: Date.now }
    }
  ],
  enrolledCourses: [
    {
      courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
      enrolledAt: { type: Date, default: Date.now },
      completion: { type: Number, default: 0 }
    }
  ]
});


const User = mongoose.model('User', userSchema);

// Post schema
const postSchema = new mongoose.Schema({
  username: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const Post = mongoose.model('Post', postSchema);

// Reply schema
const replySchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, required: true },
  username: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const Reply = mongoose.model('Reply', replySchema);

// Course schema
const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: true },
  videos: [{ type: String, required: true }],
  tags: [{ type: String }],
  createdBy: { type: String, default: 'admin' },
  enrollmentCount: { type: Number, default: 0 },
  creditsRequired: { type: Number, default: 0 }, // Credits required for the course
  ratings: [
    {
      username: { type: String, required: true },
      rating: { type: Number, required: true, min: 1, max: 5 }
    }
  ], // Array of user ratings
  test: [
    {
      question: { type: String, required: true },
      options: [{ type: String, required: true }],
      correctAnswer: { type: String, required: true }
    }
  ]
});

const Course = mongoose.model('Course', courseSchema);

// Route to fetch the logged-in user's username
app.get('/get-username', (req, res) => {
  if (req.session.username) {
    res.json({ username: req.session.username });
  } else {
    res.status(401).json({ error: 'User not logged in' });
  }
});

// Route to check if the user is logged in
app.get('/check-login', (req, res) => {
  if (req.session.username) {
    res.json({ loggedIn: true, username: req.session.username });
  } else {
    res.json({ loggedIn: false });
  }
});

// Registration route
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();
    res.json({ success: true, message: 'Registration successful!' });
  } catch (err) {
    if (err.code === 11000) {
      res.json({ success: false, message: 'Username or email already exists.' });
    } else {
      res.json({ success: false, message: 'Registration failed. Please try again.' });
    }
  }
});

// Login route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Compare the provided password with the hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Set the session
    req.session.username = user.username;
    res.json({ success: true, message: 'Login successful!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'An error occurred. Please try again.' });
  }
});

// Logout route
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error logging out' });
    }
    res.json({ success: true, message: 'Logout successful!' });
  });
});

// Route to handle post creation
app.post('/create-post', async (req, res) => {
  const { username, content } = req.body;

  if (!username || !content) {
    return res.status(400).json({ success: false, message: 'Username and content are required.' });
  }

  try {
    // Create the new post
    const newPost = new Post({ username, content });
    await newPost.save();

    // Fetch the user and update their credits
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.credits += 2; // Add 2 credits for creating a post
    await user.save();

    res.json({ success: true, message: 'Post created successfully! Credits added.' });
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).json({ success: false, message: 'Error creating post.' });
  }
});

// Route to fetch posts (with optional username filter)
app.get('/posts', async (req, res) => {
  const username = req.query.username; // Get the username from the query parameter

  try {
    let posts;
    if (username) {
      // Fetch posts for the specified username
      posts = await Post.find({ username });
    } else {
      // Fetch all posts
      posts = await Post.find();
    }
    res.json(posts);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching posts' });
  }
});

// Route to create a reply
app.post('/create-reply', async (req, res) => {
  const { postId, username, content } = req.body;

  if (!postId || !username || !content) {
    return res.status(400).json({ success: false, message: 'Post ID, username, and content are required.' });
  }

  try {
    // Create the new reply
    const newReply = new Reply({ postId, username, content });
    await newReply.save();

    // Fetch the user and update their credits
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.credits += 1; // Add 1 credit for creating a reply
    await user.save();

    res.json({ success: true, message: 'Reply created successfully! Credits added.' });
  } catch (err) {
    console.error('Error creating reply:', err);
    res.status(500).json({ success: false, message: 'Error creating reply.' });
  }
});

// Route to fetch replies for a post
app.get('/replies', async (req, res) => {
  const postId = req.query.postId;

  if (!postId) {
    return res.status(400).json({ success: false, message: 'Post ID is required' });
  }

  try {
    const replies = await Reply.find({ postId });
    res.json(replies);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching replies' });
  }
});

// Route to fetch all courses
app.get('/courses', async (req, res) => {
  try {
    const courses = await Course.find();
    res.json({ success: true, courses });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching courses' });
  }
});

// Route to add a new course (only for admin)
app.post('/add-course', async (req, res) => {
  const { title, description, image, videos, tags, test } = req.body;
  const username = req.session.username;

  // Only allow admin to add courses
  if (username !== 'admin') {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const newCourse = new Course({ title, description, image, videos, tags, test });
    await newCourse.save();
    res.json({ success: true, message: 'Course added successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error adding course' });
  }
});

// Route to fetch a single course by ID
app.get('/courses/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    res.json({ success: true, course });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching course' });
  }
});

// Route to enroll in a course
app.post('/enroll-course', async (req, res) => {
  const { courseId } = req.body;
  const username = req.session.username;

  if (!username) {
    return res.status(401).json({ success: false, message: 'User not logged in' });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Check if the user is already enrolled in the course
    const isEnrolled = user.enrolledCourses.some(course => course.courseId.toString() === courseId);
    if (isEnrolled) {
      return res.json({ success: false, message: 'You are already enrolled in this course.' });
    }

    // Check if the user has enough credits to enroll
    if (course.creditsRequired > 0 && user.credits < course.creditsRequired) {
      return res.json({ success: false, message: 'Insufficient credits to enroll in this course.' });
    }

    // Deduct credits if the course is not free
    if (course.creditsRequired > 0) {
      user.credits -= course.creditsRequired;
    }

    // Add the course to the user's enrolled courses
    user.enrolledCourses.push({ courseId });
    await user.save();

    // Increment the enrollment count for the course
    await Course.findByIdAndUpdate(courseId, { $inc: { enrollmentCount: 1 } });

    res.json({ success: true, message: 'Course enrolled successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Insufficient credits or already enrolled in this course.' });
  }
});


// Route to fetch enrolled courses
app.get('/get-enrolled-courses', async (req, res) => {
  const username = req.session.username;

  if (!username) {
    return res.status(401).json({ success: false, message: 'User not logged in' });
  }

  try {
    const user = await User.findOne({ username }).populate('enrolledCourses.courseId');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const courses = user.enrolledCourses.map(enrollment => enrollment.courseId);
    res.json({ success: true, courses });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching enrolled courses' });
  }
});

app.get('/search-courses', async (req, res) => {
  const query = req.query.tags; // Get the search query from the request
  if (!query) {
    return res.status(400).json({ success: false, message: 'Search query is required' });
  }

  try {
    // Search for courses where tags or title match the query
    const courses = await Course.find({
      $or: [
        { tags: { $in: [query] } }, // Match tags
        { title: { $regex: query, $options: 'i' } } // Match title (case-insensitive)
      ]
    });

    res.json({ success: true, courses });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error searching for courses' });
  }
});

// Video schema
const videoSchema = new mongoose.Schema({
  videoId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  thumbnail: { type: String, required: true },
});
const Video = mongoose.model('Video', videoSchema);

// Route to refresh videos
// Define categories and their associated keywords
const categories = {
  education: [
    "tutorial", "lecture", "course", "how to", "education", "learn", "study", 
    "class", "lesson", "explain", "guide", "introduction", "basics", "advanced", 
    "math", "science", "history", "programming", "language", "physics", "chemistry", 
    "biology", "economics", "literature", "art", "music", "engineering", "technology",
    "academics", "training", "workshop", "seminar", "webinar", "e-learning", "school",
    "college", "university", "degree", "diploma", "certificate", "exam", "test", 
    "quiz", "assessment", "homework", "assignment", "project", "research", 
    "thesis", "dissertation", "syllabus", "curriculum", "professor", "teacher", 
    "instructor", "mentor", "student", "pupil", "scholar", "scholarship", 
    "textbook", "notebook", "notes", "lecture notes", "MOOC", "self-study", 
    "educational video", "documentary", "learning path", "study guide", "flashcards", 
    "revision", "exam preparation", "problem-solving", "practice questions", "MCQs",
    "coding", "data structures", "algorithms", "computer science", "software development", 
    "AI", "machine learning", "deep learning", "robotics", "cybersecurity", "networking", 
    "hardware", "cloud computing", "web development", "app development", "statistics", 
    "algebra", "calculus", "geometry", "trigonometry", "probability", "accounting", 
    "finance", "business studies", "marketing", "law", "psychology", "sociology", 
    "geography", "political science", "astronomy", "environmental science", "medicine", 
    "nursing", "philosophy", "ethics", "critical thinking", "public speaking", 
    "debate", "communication skills", "presentation skills"
  ],
  technology: [
    "technology", "innovation", "gadgets", "devices", "electronics", "smartphones", 
    "laptops", "computers", "software", "hardware", "internet", "web", "cloud", 
    "artificial intelligence", "machine learning", "data science", "big data", 
    "blockchain", "cryptocurrency", "cybersecurity", "networking", "programming", 
    "coding", "web development", "app development", "robotics", "automation", 
    "IoT", "virtual reality", "augmented reality", "gaming", "tech news", "reviews"
  ],
  programming: [
    "programming", "coding", "software development", "web development", "app development", 
    "data structures", "algorithms", "python", "javascript", "java", "c++", "c#", 
    "ruby", "php", "html", "css", "react", "angular", "vue", "node.js", "django", 
    "flask", "machine learning", "AI", "data science", "big data", "cloud computing", 
    "cybersecurity", "devops", "git", "github", "debugging", "best practices", 
    "tutorial", "course", "how to", "beginner", "advanced", "interview preparation"
  ],
  science: [
    "science", "physics", "chemistry", "biology", "astronomy", "environmental science", 
    "geology", "meteorology", "neuroscience", "biotechnology", "genetics", "evolution", 
    "quantum mechanics", "relativity", "space", "universe", "earth", "climate", 
    "ecology", "scientific research", "experiments", "discoveries", "documentaries", 
    "science news", "popular science", "science communication", "science education"
  ],
  business: [
    "business", "entrepreneurship", "startups", "management", "leadership", "marketing", 
    "sales", "finance", "accounting", "investing", "stock market", "economy", 
    "business strategy", "innovation", "product management", "project management", 
    "business news", "case studies", "success stories", "business education", 
    "MBA", "business skills", "networking", "negotiation", "public speaking"
  ]
};

// Route to refresh videos
app.post('/refresh-videos', async (req, res) => {
  const apiKey = 'AIzaSyAJtx7qkZUPFmu70XA2LQHfzbwmK6RBpxs';
  const category = req.body.category || 'education'; // Default to 'education' if no category is provided
  const maxResults = 24;

  // Get the keywords for the selected category
  const keywords = categories[category] || categories.education; // Fallback to 'education' if category is invalid

  // Construct the search query by joining keywords with '|' (OR operator in YouTube API)
  const query = keywords.join('|');

  const youtubeApiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${maxResults}&q=${encodeURIComponent(query)}&type=video&key=${apiKey}`;

  try {
    const response = await axios.get(youtubeApiUrl);
    const videos = response.data.items;

    const validVideoData = [];
    for (const video of videos) {
      const thumbnailUrl = video.snippet.thumbnails.high.url;
      const thumbnailValid = await axios.head(thumbnailUrl).then(() => true).catch(() => false);

      if (thumbnailValid) {
        validVideoData.push({
          videoId: video.id.videoId,
          title: video.snippet.title,
          thumbnail: video.snippet.thumbnails.high.url,
          category: category // Add the category to the video data
        });
      }
    }

    if (validVideoData.length > 0) {
      await Video.deleteMany({});
      await Video.insertMany(validVideoData);
      res.json({ success: true, message: 'Videos refreshed successfully!', category });
    } else {
      res.json({ success: false, message: 'No valid videos found with valid thumbnails.', category });
    }
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ success: false, message: 'Failed to refresh videos', category });
  }
});

// Route to fetch videos dynamically
app.get('/get-videos', async (req, res) => {
  try {
    const videos = await Video.find();
    res.json({ success: true, videos });
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ success: false, message: 'Error fetching videos' });
  }
});

app.post('/add-to-history', async (req, res) => {
  if (!req.session.username) {
    return res.status(401).json({ success: false, message: 'User not logged in' });
  }

  const { videoId, title, thumbnail, courseId } = req.body;

  try {
    const user = await User.findOne({ username: req.session.username });

    // Check if the video already exists in the user's history
    const existingVideoIndex = user.history.findIndex(entry => entry.videoId === videoId);

    if (existingVideoIndex !== -1) {
      // If the video already exists, update the existing entry
      user.history[existingVideoIndex] = { videoId, title, thumbnail, watchedAt: new Date() };
    } else {
      // If the video does not exist, add it to the history
      user.history.push({ videoId, title, thumbnail, watchedAt: new Date() });
      user.credits += 3; // Add 3 credits for watching a new video
    }

    // Update completion progress for the course
    const enrolledCourse = user.enrolledCourses.find(course => course.courseId.toString() === courseId);
    if (enrolledCourse) {
      // Ensure completion does not exceed the total number of videos
      const course = await Course.findById(courseId);
      if (enrolledCourse.completion < course.videos.length) {
        enrolledCourse.completion += 1; // Increment completion count
      }
    }

    await user.save();
    res.json({ success: true, message: 'Video added to history and completion updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error saving history or updating completion.' });
  }
});

// Route to fetch user's completion progress for a course
app.get('/user-progress', async (req, res) => {
  const username = req.session.username;
  const courseId = req.query.courseId;

  if (!username) {
    return res.status(401).json({ success: false, message: 'User not logged in' });
  }

  try {
    const user = await User.findOne({ username }).populate('enrolledCourses.courseId');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const enrolledCourse = user.enrolledCourses.find(course => course.courseId._id.toString() === courseId);
    if (!enrolledCourse) {
      return res.status(404).json({ success: false, message: 'User is not enrolled in this course' });
    }

    res.json({ success: true, completion: enrolledCourse.completion });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching user progress' });
  }
});


app.get('/get-history', async (req, res) => {
  if (!req.session.username) {
    return res.status(401).json({ success: false, message: 'User not logged in' });
  }

  try {
    const user = await User.findOne({ username: req.session.username });
    res.json({ success: true, history: user.history });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching history' });
  }
});

// Route to fetch user's credits
app.get('/get-user-credits', async (req, res) => {
  const username = req.session.username;

  if (!username) {
    return res.status(401).json({ success: false, message: 'User not logged in' });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, credits: user.credits });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching user credits' });
  }
});

//Route for Fetching a Test
app.get('/course-test/:courseId', async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }
    res.json({ success: true, test: course.test });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching test.' });
  }
});
//Route for Submitting a Test
app.post('/submit-test/:courseId', async (req, res) => {
  const { username, answers } = req.body;

  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    let score = 0;
    course.test.forEach((question, index) => {
      if (answers[index] === question.correctAnswer) {
        score++;
      }
    });

    const percentage = (score / course.test.length) * 100;
    const passed = percentage >= 75;

    res.json({ success: true, score, percentage, passed });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error submitting test.' });
  }
});

//Route to Generate a Certificate
app.post('/generate-certificate', async (req, res) => {
  const { username, courseId } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    // Add the certificate to the user's profile
    user.certificates.push({ courseId, issuedAt: new Date() });
    await user.save();

    res.json({ success: true, message: 'Certificate issued successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error generating certificate.' });
  }
});

app.post('/submit-rating', async (req, res) => {
  const { courseId, username, rating } = req.body;

  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    // Check if the user has already rated the course
    const existingRatingIndex = course.ratings.findIndex(r => r.username === username);
    if (existingRatingIndex !== -1) {
      course.ratings[existingRatingIndex].rating = rating; // Update existing rating
    } else {
      course.ratings.push({ username, rating }); // Add new rating
    }

    await course.save();
    res.json({ success: true, message: 'Rating submitted successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error submitting rating.' });
  }
});

// Serve home page
app.get('/home', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});