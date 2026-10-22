import './SearchProducts.css';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  X,
  Package,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowLeft,
  Sparkles,
  ShoppingBag,
  Image as ImageIcon,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { Button } from '../../components/Button';
import { soundService } from '../../services/soundService';
import { BARCODE_CAPTURED_EVENT } from '../../services/scannerEvents';

export const SearchProducts: React.FC = () => {
  const { products, setCustomerScreen, settings } = useCart();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const clearScannedBarcode = () => setSearchTerm('');
    window.addEventListener(BARCODE_CAPTURED_EVENT, clearScannedBarcode);
    return () => window.removeEventListener(BARCODE_CAPTURED_EVENT, clearScannedBarcode);
  }, []);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.category)));
    return ['All', ...cats];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode.includes(searchTerm) ||
        (product.aisleLocation && product.aisleLocation.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'All' || product.category === selectedCategory;

      const matchesStock = !onlyInStock || product.stock > 0;

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, searchTerm, selectedCategory, onlyInStock]);

  const handleClear = () => {
    soundService.playKeyClick();
    setSearchTerm('');
    inputRef.current?.focus();
  };

  return (
    <div className="search-products__item-1">

      <div className="search-products__item-2">
        <div className="search-products__item-3">
          <div className="search-products__item-4">
            <button
              onClick={() => {
                soundService.playKeyClick();
                setCustomerScreen('SHOPPING_HOME');
              }}
              className="search-products__item-5"
            >
              <ArrowLeft className="search-products__item-6" />
            </button>
            <div>
              <h2 className="search-products__item-7">
                <Search className="search-products__item-8" />
                <span>Search Products & Check Stock</span>
              </h2>
            </div>
          </div>

        </div>


        <div className="search-products__item-9">
          <Search className="search-products__item-10" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search product"
            className="search-products__item-11"
            data-barcode-capture
          />

          {searchTerm && (
            <button
              onClick={handleClear}
              className="search-products__item-12"
            >
              <X className="search-products__item-13" />
            </button>
          )}
        </div>


        <div className="search-products__item-14">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                soundService.playKeyClick();
                setSelectedCategory(cat);
              }}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}

          <button
            onClick={() => {
              soundService.playKeyClick();
              setOnlyInStock(!onlyInStock);
            }}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all shrink-0 ml-auto cursor-pointer ${
              onlyInStock
                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {onlyInStock ? '✓ In Stock Only' : 'Show All Stock'}
          </button>
        </div>
      </div>


      {/* Legacy inline keypad replaced by the automatic global keyboard.
        <div className="search-products__item-15">
          <div className="search-products__item-16">
            {['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'].map((k) => (
              <button
                key={k}
                onClick={() => handleKeyTouch(k)}
                className="search-products__item-17"
              >
                {k}
              </button>
            ))}
          </div>
          <div className="search-products__item-18">
            {['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'].map((k) => (
              <button
                key={k}
                onClick={() => handleKeyTouch(k)}
                className="search-products__item-19"
              >
                {k}
              </button>
            ))}
          </div>
          <div className="search-products__item-20">
            {['Z', 'X', 'C', 'V', 'B', 'N', 'M'].map((k) => (
              <button
                key={k}
                onClick={() => handleKeyTouch(k)}
                className="search-products__item-21"
              >
                {k}
              </button>
            ))}
            <button
              onClick={() => handleKeyTouch(' ')}
              className="search-products__item-22"
            >
              SPACE
            </button>
            <button
              onClick={handleBackspaceTouch}
              className="search-products__item-23"
            >
              ⌫
            </button>
          </div>
        </div>
      */}


      <div className="search-products__item-24">
        {filteredProducts.length === 0 ? (
          <div className="search-products__item-25">
            <div className="search-products__item-26">
              <Search className="search-products__item-27" />
            </div>
            <h3 className="search-products__item-28">No products found</h3>
            <Button
              variant="secondary"
              size="sm"
              className="search-products__item-29"
              onClick={handleClear}
            >
              Reset Search
            </Button>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const isOutOfStock = product.stock <= 0;
            const isLowStock = product.stock > 0 && product.stock <= product.minimumStock;

            return (
              <div
                key={product.id}
                className={`p-2.5 sm:p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isOutOfStock
                    ? 'bg-slate-900/40 border-slate-800/60 opacity-75'
                    : 'bg-slate-900/90 border-slate-800/90 hover:border-slate-700'
                }`}
              >

                <div className="search-product-image">{product.image ? <img src={product.image} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <ImageIcon />}</div>
                <div className="search-products__item-30">
                  <div className="search-products__item-31">
                    <span className="search-products__item-32">
                      {product.name}
                    </span>
                    <span className="search-products__item-33">
                      {product.category}
                    </span>
                  </div>

                  <div className="search-products__item-34">
                    <span className="search-products__item-35">
                      {settings.currencySymbol}{product.price.toFixed(2)}
                    </span>
                    <span className="search-products__item-36">·</span>
                    <span className="search-products__item-37">{product.expectedWeightGrams}g</span>


                    <span className="search-products__item-38">·</span>
                    {isOutOfStock ? (
                      <span className="search-products__item-39">
                        <XCircle className="search-products__item-40" />
                        <span>Out of Stock</span>
                      </span>
                    ) : isLowStock ? (
                      <span className="search-products__item-41">
                        <AlertTriangle className="search-products__item-42" />
                        <span>Low Stock ({product.stock} left)</span>
                      </span>
                    ) : (
                      <span className="search-products__item-43">
                        <CheckCircle2 className="search-products__item-44" />
                        <span>In Stock ({product.stock} available)</span>
                      </span>
                    )}
                  </div>


                  {product.aisleLocation && (
                    <div className="search-products__item-45">
                      <MapPin className="search-products__item-46" />
                      <span>{product.aisleLocation}</span>
                    </div>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>


      <div className="search-products__item-47">
        <span className="search-products__item-48">
          Showing <strong className="search-products__item-49">{filteredProducts.length}</strong> of {products.length} catalog items
        </span>

        <Button
          variant="secondary"
          size="sm"
          className="search-products__item-50"
          onClick={() => {
            soundService.playKeyClick();
            setCustomerScreen('SHOPPING_HOME');
          }}
        >
          Return to Shopping
        </Button>
      </div>
    </div>
  );
};
