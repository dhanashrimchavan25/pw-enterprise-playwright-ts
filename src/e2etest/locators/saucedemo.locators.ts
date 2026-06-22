export const saucedemoLocators = {
  login: {
    username: '[data-test="username"]',
    password: '[data-test="password"]',
    loginButton: '[data-test="login-button"]',
    error: '[data-test="error"]',
  },
  inventory: {
    title: '[data-test="title"]',
    inventoryItem: '[data-test="inventory-item"]',
    item: ".inventory_item",
    productName: ".inventory_item_name",
    productSort: "select.product_sort_container",
    addToCartButton: '[data-test^="add-to-cart-"]',
    cartLink: '[data-test="shopping-cart-link"]',
    cartBadge: ".shopping_cart_badge",
  },
  cart: {
    container: "#cart_contents_container",
    cartItem: ".cart_item",
    checkoutButton: '[data-test="checkout"]',
  },
  checkout: {
    firstName: '[data-test="firstName"]',
    lastName: '[data-test="lastName"]',
    postalCode: '[data-test="postalCode"]',
    continueButton: '[data-test="continue"]',
    finishButton: '[data-test="finish"]',
    completeHeader: '[data-test="complete-header"]',
  },
} as const;
