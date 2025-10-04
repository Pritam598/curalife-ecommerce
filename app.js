// Firebase config
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "your-app.firebaseapp.com",
  databaseURL: "https://your-app.firebaseio.com",
  projectId: "your-app",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "xxxx",
  appId: "xxxx"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
const functions = firebase.app().functions("asia-south1"); // Choose region near you

// --- Auth Functions ---
function register() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  auth.createUserWithEmailAndPassword(email, password)
    .then(user => {
      db.ref("users/" + user.user.uid).set({ email });
      alert("Registered!");
    })
    .catch(err => alert(err.message));
}

function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  auth.signInWithEmailAndPassword(email, password)
    .then(() => alert("Logged in!"))
    .catch(err => alert(err.message));
}

function logout() {
  auth.signOut();
  alert("Logged out!");
}

// --- Auth State ---
auth.onAuthStateChanged(user => {
  if (user) {
    document.getElementById("products-section").style.display = "block";
    loadProducts();
  } else {
    document.getElementById("products-section").style.display = "none";
  }
});

// --- Products ---
let cart = [];

function loadProducts() {
  db.ref("products").once("value", snap => {
    const products = snap.val();
    const container = document.getElementById("products");
    container.innerHTML = "";
    for (let id in products) {
      const p = products[id];
      container.innerHTML += `
        <div>
          <b>${p.name}</b> - ₹${p.price}
          <button onclick="addToCart('${id}', '${p.name}', ${p.price})">Add</button>
        </div>
      `;
    }
  });
}

function addToCart(id, name, price) {
  cart.push({ id, name, price });
  renderCart();
}

function renderCart() {
  const ul = document.getElementById("cart");
  ul.innerHTML = "";
  cart.forEach(item => {
    ul.innerHTML += `<li>${item.name} - ₹${item.price}</li>`;
  });
}

// --- Checkout ---
function checkout() {
  if (cart.length === 0) return alert("Cart is empty");

  const total = cart.reduce((sum, item) => sum + item.price, 0);

  const createOrder = functions.httpsCallable("createOrder");
  createOrder({ amount: total }).then(res => {
    const orderId = res.data.id;

    const options = {
      key: "YOUR_RAZORPAY_KEY_ID",
      amount: total * 100,
      currency: "INR",
      order_id: orderId,
      handler: function (response) {
        const uid = auth.currentUser.uid;
        db.ref("transactions").push({
          userId: uid,
          cart: cart,
          amount: total,
          paymentId: response.razorpay_payment_id,
          orderId: response.razorpay_order_id,
          signature: response.razorpay_signature,
          status: "success"
        });
        alert("Payment Success!");
        cart = [];
        renderCart();
      }
    };

    const rzp = new Razorpay(options);
    rzp.open();
  });
}
