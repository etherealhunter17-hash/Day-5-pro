import React, { useEffect, useState } from "react";

export default function App() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [cartItems, setCartItems] = useState([]);
  const [pendingProductId, setPendingProductId] = useState(null);
  const [cartError, setCartError] = useState("");
  const [view, setView] = useState("catalog");
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedName, setSubmittedName] = useState("");
  const [orderSubmitted, setOrderSubmitted] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      setStatus("loading");
      setErrorMessage("");

      try {
        const response = await fetch("https://dummyjson.com/products", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`The product service returned ${response.status}.`);
        }

        const data = await response.json();

        if (!Array.isArray(data.products)) {
          throw new Error("The product service returned an unexpected response.");
        }

        setProducts(data.products);
        setStatus(data.products.length === 0 ? "empty" : "success");
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setErrorMessage(
          error instanceof Error ? error.message : "An unexpected error occurred.",
        );
        setStatus("error");
      }
    }

    loadProducts();
    return () => controller.abort();
  }, [retryCount]);

  function retryConnection() {
    setRetryCount((count) => count + 1);
  }

  async function addToCart(product) {
    if (pendingProductId !== null) return;

    setPendingProductId(product.id);
    setCartError("");

    try {
      const response = await fetch("https://dummyjson.com/carts/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: 1,
          products: [{ id: product.id, quantity: 1 }],
        }),
      });

      if (!response.ok) {
        throw new Error(`The cart service returned ${response.status}.`);
      }

      await response.json();
      setCartItems((items) => {
        const existingItem = items.find((item) => item.id === product.id);
        if (existingItem) {
          return items.map((item) =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
          );
        }
        return [...items, { ...product, quantity: 1 }];
      });
      setView("cart");
    } catch (error) {
      setCartError(
        error instanceof Error ? error.message : "Unable to add this product to your cart.",
      );
    } finally {
      setPendingProductId(null);
    }
  }

  function removeFromCart(productId) {
    setCartItems((items) => items.filter((item) => item.id !== productId));
  }

  const cartQuantity = cartItems.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredProducts = products.filter((product) =>
    [product.title, product.brand, product.category, product.description]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(normalizedSearchQuery)),
  );

  return (
    <main className="catalog-page">
      <section className="catalog-content" aria-labelledby="catalog-title">
        <header className="catalog-heading">
          {view === "catalog" ? (
            <>
              <p className="catalog-eyebrow">THE EVERYDAY ESSENTIALS
              </p>
              <h1 id="catalog-title">The Space Shop</h1>
              <p className="catalog-intro">
                Thoughtful picks for your everyday needs.
              </p>
            </>
          ) : view === "cart" ? (
            <>
              <p className="catalog-eyebrow">YOUR SELECTION</p>
              <h1 id="catalog-title">Your cart</h1>
              <p className="catalog-intro">
                {cartQuantity} {cartQuantity === 1 ? "item" : "items"} in your cart
              </p>
            </>
          ) : (
            <>
              <p className="catalog-eyebrow">ALMOST THERE</p>
              <h1 id="catalog-title">{orderSubmitted ? "Order received" : "Checkout"}</h1>
              <p className="catalog-intro">
                {orderSubmitted
                  ? "Thank you for shopping with The Space Shop."
                  : "Enter your details to complete your order."}
              </p>
            </>
          )}
        </header>

        {view === "cart" && (
          <section className="cart-view" aria-label="Shopping cart">
            {cartItems.length === 0 ? (
              <div className="catalog-message">
                <h2>Your cart is empty</h2>
                <p>Explore the catalog and add something you love.</p>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cartItems.map((item) => (
                    <article className="cart-item" key={item.id}>
                      <img src={item.thumbnail} alt="" />
                      <div className="cart-item-info">
                        <h2>{item.title}</h2>
                        <p>Quantity: {item.quantity}</p>
                      </div>
                      <span className="cart-item-price">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                      <button
                        className="remove-button"
                        onClick={() => removeFromCart(item.id)}
                        aria-label={`Remove ${item.title} from cart`}
                      >
                        Remove
                      </button>
                    </article>
                  ))}
                </div>
                <div className="cart-summary">
                  <span>Subtotal</span>
                  <strong>${cartTotal.toFixed(2)}</strong>
                </div>
                <p className="cart-demo-note">
                  No payment will be collected.
                </p>
              </>
            )}
            <button className="continue-button" onClick={() => setView("catalog")}>
              Continue shopping
            </button>
            {cartItems.length > 0 && (
              <button
                className="checkout-button"
                onClick={() => {
                  setOrderSubmitted(false);
                  setView("checkout");
                }}
              >
                Proceed to checkout
              </button>
            )}
          </section>
        )}

        {view === "checkout" && (
          <section className="checkout-view" aria-label="Checkout">
            {orderSubmitted ? (
              <div className="checkout-confirmation" role="status">
                <h2>Thanks, {submittedName}!</h2>
                <p>Your demo order has been submitted successfully.</p>
                <button className="continue-button" onClick={() => setView("catalog")}>
                  Continue shopping
                </button>
              </div>
            ) : (
              <>
                <div className="checkout-summary">
                  <span>
                    Order total ({cartQuantity} {cartQuantity === 1 ? "item" : "items"})
                  </span>
                  <strong>${cartTotal.toFixed(2)}</strong>
                </div>
                <form
                  className="checkout-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    setSubmittedName(formData.get("name").trim());
                    setOrderSubmitted(true);
                  }}
                >
                  <label>
                    Name
                    <input name="name" type="text" autoComplete="name" required />
                  </label>
                  <label>
                    Age
                    <input
                      name="age"
                      type="number"
                      min="1"
                      max="120"
                      step="1"
                      inputMode="numeric"
                      required
                    />
                  </label>
                  <label>
                    Email
                    <input name="email" type="email" autoComplete="email" required />
                  </label>
                  <button className="checkout-button" type="submit">
                    Submit order
                  </button>
                </form>
                <button className="continue-button" onClick={() => setView("cart")}>
                  Back to cart
                </button>
              </>
            )}
          </section>
        )}

        {view === "catalog" && cartError && (
          <p className="cart-error" role="alert">
            {cartError} Please try adding the item again.
          </p>
        )}

        {view === "catalog" && status === "loading" && (
          <div className="catalog-message" aria-live="polite">
            <span className="loading-spinner" aria-hidden="true" />
            <h2>Finding your products</h2>
            <p>Just a moment while the catalog loads.</p>
          </div>
        )}

        {view === "catalog" && status === "error" && (
          <div className="catalog-message" aria-live="polite">
            <h2>Products couldn’t be loaded</h2>
            <p>{errorMessage} Check your connection and try again.</p>
            <button className="retry-button" onClick={retryConnection}>
              Try again
            </button>
          </div>
        )}

        {view === "catalog" && status === "empty" && (
          <div className="catalog-message" aria-live="polite">
            <h2>No products to show</h2>
            <p>The catalog is empty right now. Please check back later.</p>
          </div>
        )}

        {view === "catalog" && status === "success" && (
          <>
            <label className="product-search">
              <svg
                className="product-search-icon"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="8.75" cy="8.75" r="5.75" />
                <path d="m13 13 4 4" />
              </svg>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search products..."
                aria-label="Search products"
              />
            </label>
            <p className="product-count">
              {filteredProducts.length}{" "}
              {filteredProducts.length === 1 ? "piece" : "pieces"} to explore
            </p>
            {filteredProducts.length === 0 ? (
              <div className="catalog-message" aria-live="polite">
                <h2>No matching products</h2>
                <p>Try a different search term to find what you’re looking for.</p>
              </div>
            ) : (
              <div className="product-grid" aria-live="polite">
                {filteredProducts.map((product) => (
                  <article className="product-card" key={product.id}>
                    <div className="product-image-wrap">
                      <img
                        className="product-image"
                        src={product.thumbnail}
                        alt={product.title}
                        loading="lazy"
                      />
                      <span className="product-category">{product.category}</span>
                      {product.discountPercentage > 0 && (
                        <span className="product-discount">
                          -{Math.round(product.discountPercentage)}%
                        </span>
                      )}
                    </div>
                    <div className="product-details">
                      <div className="product-title-row">
                        <h2>{product.title}</h2>
                        <span className="product-rating" aria-label={`Rating: ${product.rating}`}>
                          <span aria-hidden="true">★</span> {product.rating}
                        </span>
                      </div>
                      {product.brand && <p className="product-brand">{product.brand}</p>}
                      <p className="product-description">{product.description}</p>
                      <div className="product-bottom-row">
                        <span className="product-price">${product.price.toFixed(2)}</span>
                        <span className={`product-stock ${product.stock === 0 ? "sold-out" : ""}`}>
                          {product.stock > 0 ? `${product.stock} available` : "Sold out"}
                        </span>
                      </div>
                      <button
                        className="add-to-cart-button"
                        onClick={() => addToCart(product)}
                        disabled={product.stock === 0 || pendingProductId !== null}
                      >
                        {pendingProductId === product.id ? (
                          <>
                            <span className="button-spinner" aria-hidden="true" />
                            Adding...
                          </>
                        ) : (
                          "Add to cart"
                        )}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
