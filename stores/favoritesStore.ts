"use client";

import { create } from "zustand";
import {
  createJSONStorage,
  persist,
} from "zustand/middleware";

import type { Product } from "@/types/product";

interface FavoritesState {
  items: Product[];
  hydrated: boolean;

  addFavorite: (product: Product) => void;
  removeFavorite: (productId: string) => void;
  toggleFavorite: (product: Product) => void;
  isFavorite: (productId: string) => boolean;
  clearFavorites: () => void;
  setHydrated: (value: boolean) => void;
}

export const useFavoritesStore =
  create<FavoritesState>()(
    persist(
      (set, get) => ({
        items: [],
        hydrated: false,

        addFavorite: (product) => {
          const exists = get().items.some(
            (item) => item.id === product.id,
          );

          if (exists) {
            return;
          }

          set((state) => ({
            items: [...state.items, product],
          }));
        },

        removeFavorite: (productId) => {
          set((state) => ({
            items: state.items.filter(
              (item) => item.id !== productId,
            ),
          }));
        },

        toggleFavorite: (product) => {
          const exists = get().items.some(
            (item) => item.id === product.id,
          );

          if (exists) {
            get().removeFavorite(product.id);
            return;
          }

          get().addFavorite(product);
        },

        isFavorite: (productId) =>
          get().items.some(
            (item) => item.id === productId,
          ),

        clearFavorites: () => {
          set({ items: [] });
        },

        setHydrated: (value) => {
          set({ hydrated: value });
        },
      }),
      {
        name: "devplay-favorites",

        storage: createJSONStorage(
          () => localStorage,
        ),

        partialize: (state) => ({
          items: state.items,
        }),

        onRehydrateStorage: () => {
          return (state) => {
            state?.setHydrated(true);
          };
        },
      },
    ),
  );