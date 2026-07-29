-- Add test banners for design verification
INSERT INTO banners (eyebrow, title, subtitle, offer_text, coupon_code, button_text, validity_text, image, href, active, created_at) VALUES
('FESTIVE OFFER', 'Flat 15% OFF', 'on all orders above ₹999', 'Use Code:', 'FESTIVE15', 'Shop Now', 'Offer valid till 15 Aug 2026', NULL, '/shop', true, NOW()),
('WEEKEND SPECIAL', 'Buy 2 Get 1 FREE', 'on all millet snacks', 'Use Code:', 'WEEKEND3', 'Explore Snacks', 'Valid this weekend only', NULL, '/shop', true, NOW()),
('NEW ARRIVALS', '20% OFF', 'on our new combo boxes', 'Use Code:', 'COMBO20', 'View Combos', 'Limited time offer', NULL, '/shop?tab=combos', true, NOW());
