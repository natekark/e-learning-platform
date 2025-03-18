// Registration
document.getElementById('registrationForm').addEventListener('submit', function(event) {
  event.preventDefault();
  
  const username = document.getElementById('regUsername').value;
  const password = document.getElementById('regPassword').value;

  fetch('/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      window.location.href = '/home'; // Redirect to home page after registration
    } else {
      console.error('Error:', data.message);
    }
  })
  .catch(error => console.error('Error:', error));
});

// Login
document.getElementById('loginForm').addEventListener('submit', function(event) {
  event.preventDefault();

  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;

  fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      window.location.href = '/home'; // Redirect to home page after login
    } else {
      console.error('Error:', data.message);
    }
  })
  .catch(error => console.error('Error:', error));
});

// Post creation
document.getElementById('createPostForm').addEventListener('submit', function(event) {
  event.preventDefault();

  const postContent = document.getElementById('postContent').value;

  fetch('/create-post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: postContent }) // Use 'content' key
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      loadPosts(); // Reload posts after creating a new one
    } else {
      console.error('Error creating post:', data.message);
    }
  })
  .catch(error => console.error('Error:', error));
});

// Function to load posts and display them on the page
function loadPosts() {
  fetch('/posts')
    .then(response => response.json())
    .then(posts => {
      const postsContainer = document.getElementById('postsContainer');
      postsContainer.innerHTML = ''; // Clear existing posts

      posts.forEach(post => {
        const postElement = document.createElement('div');
        postElement.classList.add('post');

        const usernameElement = document.createElement('p');
        usernameElement.classList.add('username');
        usernameElement.textContent = '@' + post.username;

        const contentElement = document.createElement('p');
        contentElement.textContent = post.content;

        postElement.appendChild(usernameElement);
        postElement.appendChild(contentElement);
        postsContainer.appendChild(postElement);
      });
    })
    .catch(error => console.error('Error loading posts:', error));
}

// Load posts when the page loads
document.addEventListener('DOMContentLoaded', function() {
  loadPosts();
});
