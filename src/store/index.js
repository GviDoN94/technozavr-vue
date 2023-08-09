import Vue from "vue";
import Vuex from "vuex";
import axios from "axios";
import { API_BASE_URL } from "@/config";

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    cartProducts: [],
    userAccessKey: null,
    cartProductsData: [],
    cartLoading: false,
    cartLoadingFailed: false,
  },
  mutations: {
    resetCart(state) {
      state.cartProducts = [];
      state.cartProductsData = [];
    },
    updateCartProductAmount(state, { productId, amount }) {
      const item = state.cartProducts.find(
        (item) => item.productId === productId
      );

      if (item) {
        item.amount = amount;
      }
    },
    updateUserAccessKey(state, accessKey) {
      state.userAccessKey = accessKey;
    },
    updateCartProductsData(state, items) {
      state.cartProductsData = items;
    },
    syncCartProducts(state) {
      state.cartProducts = state.cartProductsData.map((item) => {
        return {
          productId: item.product.id,
          amount: item.quantity,
        };
      });
    },
    setCartLoading(state, isLoading) {
      state.cartLoading = isLoading;
    },
    setCartLoadingFailed(state, hasFailed) {
      state.cartLoadingFailed = hasFailed;
    },
  },
  getters: {
    cartDetailProducts(state) {
      return state.cartProducts.map((item) => {
        const product = state.cartProductsData.find(
          (p) => p.product.id === item.productId
        ).product;
        return {
          ...item,
          product: {
            ...product,
            image: product.image.file.url,
          },
        };
      });
    },
    cartTotalPrice(state, getters) {
      return getters.cartDetailProducts.reduce(
        (acc, item) => item.product.price * item.amount + acc,
        0
      );
    },
    cartTotalAmount(state, getters) {
      return getters.cartDetailProducts.reduce(
        (acc, item) => item.amount + acc,
        0
      );
    },
  },
  actions: {
    loadCart(context) {
      context.commit("setCartLoading", true);
      context.commit("setCartLoadingFailed", false);

      return axios
        .get(`${API_BASE_URL}/api/baskets`, {
          params: {
            userAccessKey: context.state.userAccessKey,
          },
        })
        .then((response) => {
          if (!context.state.userAccessKey) {
            localStorage.setItem("userAccessKey", response.data.user.accessKey);
            context.commit("updateUserAccessKey", response.data.user.accessKey);
          }
          context.commit("updateCartProductsData", response.data.items);
          context.commit("syncCartProducts");
        })
        .catch((error) => {
          context.commit("setCartLoadingFailed", true);
          console.log(error);
        })
        .finally(() => context.commit("setCartLoading", false));
    },
    addProductToCart(context, { productId, amount }) {
      return axios
        .post(
          `${API_BASE_URL}/api/baskets/products`,
          {
            productId,
            quantity: amount,
          },
          {
            params: {
              userAccessKey: context.state.userAccessKey,
            },
          }
        )
        .then((response) => {
          context.commit("updateCartProductsData", response.data.items);
          context.commit("syncCartProducts");
        });
    },
    updateCartProductAmount(context, { productId, amount }) {
      context.commit("updateCartProductAmount", { productId, amount });

      if (amount < 1) {
        return;
      }

      return axios
        .put(
          `${API_BASE_URL}/api/baskets/products`,
          {
            productId,
            quantity: amount,
          },
          {
            params: {
              userAccessKey: context.state.userAccessKey,
            },
          }
        )
        .then((response) => {
          context.commit("updateCartProductsData", response.data.items);
        })
        .catch((error) => {
          console.log(error);
          context.commit("syncCartProducts");
        });
    },
    deleteCartProduct(context, productId) {
      return axios
        .delete(`${API_BASE_URL}/api/baskets/products`, {
          data: { productId },
          params: {
            userAccessKey: context.state.userAccessKey,
          },
        })
        .then((response) => {
          context.commit("updateCartProductsData", response.data.items);
          context.commit("syncCartProducts");
        });
    },
  },
});
