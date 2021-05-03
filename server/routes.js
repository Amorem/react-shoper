require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_API_SECRET);
const express = require("express");
const products = require("./products.json");
const { validateCartItems } = require("use-shopping-cart/src/serverUtil");

module.exports = function getRoutes() {
  const router = express.Router();

  router.get("/products", getProducts);

  router.get("/products/:productId", getProduct);

  router.post("/checkout-sessions", createCheckoutSessions);

  router.get("/checkout-sessions/:sessionId", getCheckoutSession);

  return router;
};

function getProducts(req, res) {
  res.status(200).json({ products });
}

function getProduct(req, res) {
  const { productId } = req.params;
  const product = products.find((product) => product.id === productId);
  try {
    if (!product) {
      throw Error(`No product found for id: ${productId}`);
    }
  } catch (error) {
    res.status(404).json({ statusCode: 404, message: error.message });
  }
  res.status(200).json({ product });
}

const origin =
  process.env.NODE_ENV === "production"
    ? req.headers.origin
    : "http://localhost:3000";

async function createCheckoutSessions(req, res) {
  try {
    const cartItems = req.body;
    const line_items = validateCartItems(products, cartItems);
    const params = {
      submit_type: "pay",
      payment_method_types: ["card"],
      billing_address_collection: "auto",
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
      line_items,
      success_url: `${origin}/result?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: origin,
      mode: "payment",
    };
    const checkoutSession = await stripe.checkout.sessions.create(params);
    res.status(200).json(checkoutSession);
  } catch (error) {
    res.status(500).json({ statusCode: 500, message: error.message });
  }
}

async function getCheckoutSession(req, res) {
  const { sessionId } = req.params;
  // console.log("sessionId", sessionId);
  try {
    if (!sessionId.startsWith("cs_")) {
      throw Error("Incorrect checkout session id");
    }
    const checkout_session = await stripe.checkout.sessions.retrieve(
      sessionId,
      {
        expand: ["payment_intent"],
      }
    );
    res.status(200).json(checkout_session);
  } catch (error) {
    console.log("Error", error);
    res.status(500).json({ statusCode: 500, message: error.message });
  }
}
