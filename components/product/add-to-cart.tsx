"use client";

import { useState } from "react";
import type { Product } from "@/lib/catalog";
import { useCart } from "@/components/cart/cart-provider";

export function AddToCart({ product, quantity = 1, className = "", showModal = false }: { product: Product; quantity?: number; className?: string; showModal?: boolean }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  function handleClick() {
    if (showModal) {
      setModalOpen(true);
    } else {
      add(quantity);
    }
  }

  function add(qty: number) {
    addItem(product, qty);
    setAdded(true);
    setModalOpen(false);
    window.setTimeout(() => setAdded(false), 1400);
  }

  return (
    <>
      <button className={`button button-dark ${className}`} onClick={handleClick}>
        {added ? "Added to cart ✓" : "Add to cart"}
      </button>

      {modalOpen && (
        <>
          <div className="modal-overlay" onClick={() => setModalOpen(false)} />
          <div className="quantity-modal">
            <div className="quantity-modal-header">
              <h3>{product.name}</h3>
              <button className="close-modal-btn" onClick={() => setModalOpen(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="quantity-modal-body">
              <p className="quantity-label">Select Quantity</p>
              <div className="quantity-selector">
                <button
                  type="button"
                  onClick={() => setSelectedQuantity(Math.max(1, selectedQuantity - 1))}
                  disabled={selectedQuantity <= 1}
                >
                  −
                </button>
                <span>{selectedQuantity}</span>
                <button
                  type="button"
                  onClick={() => setSelectedQuantity(selectedQuantity + 1)}
                >
                  +
                </button>
              </div>
              <button
                className="button button-dark"
                onClick={() => add(selectedQuantity)}
                style={{ width: "100%", marginTop: "16px" }}
              >
                Add {selectedQuantity} to cart
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
