"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2 } from "lucide-react";

export interface AddressData {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude: number;
  longitude: number;
  number?: string;
  neighborhood?: string;
}

interface PhotonFeature {
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
    district?: string;
    suburb?: string;
    locality?: string;
    town?: string;
    state_code?: string;
    neighbourhood?: string;
    osm_id?: string | number;
    osm_type?: string;
    [key: string]: string | number | undefined;
  };
  geometry: { coordinates: [number, number] };
}

interface AddressAutocompleteProps {
  onAddressSelect: (addressData: AddressData) => void;
  placeholder?: string;
  label?: string;
  value?: string;
  error?: string;
  hideLabel?: boolean;
}

export default function AddressAutocomplete({
  onAddressSelect,
  placeholder = "Digite o endereço...",
  label = "Endereço",
  value = "",
  error,
  hideLabel = false,
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<PhotonFeature[]>([]);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const debounceRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);
  const listboxId = 'address-suggestions';

  // Debounce de busca
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (inputValue && inputValue.length >= 2) {
      debounceRef.current = window.setTimeout(() => {
        searchPhoton(inputValue);
      }, 300);
    } else {
      setSuggestions([]);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue]);

  const searchPhoton = async (query: string) => {
    setIsLoading(true);
    try {
      requestIdRef.current += 1;
      const rid = requestIdRef.current;
      const url = `/api/photon?q=${encodeURIComponent(query)}&limit=6`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({} as any));
        console.warn('Photon indisponível:', res.status, errorData?.detail);
        setSuggestions([]);
        setServiceUnavailable(true);
        return;
      }
      const data = await res.json();
      const features: PhotonFeature[] = data?.features || [];
      if (rid !== requestIdRef.current) {
        return;
      }
      setServiceUnavailable(false);
      setSuggestions(features);
      setActiveIndex(features.length ? 0 : -1);
    } catch (err) {
      console.error("Erro ao buscar endereços no Photon (proxy):", err);
      setServiceUnavailable(true);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatSuggestion = (f: PhotonFeature) => {
    const p = f.properties || {};
    const primary = [p.street || p.name, p.housenumber]
      .filter(Boolean)
      .join(", ");
    const city = p.city || p.locality || p.town;
    const state = p.state || p.state_code;
    const secondary = [city, state, p.postcode]
      .filter(Boolean)
      .join(", ");
    return { primary, secondary };
  };

  const parsePhotonFeature = (f: PhotonFeature): AddressData => {
    const p = f.properties || {};
    const address = [p.street || p.name, p.housenumber]
      .filter(Boolean)
      .join(", ");
    const city = p.city || p.locality || p.town || "";
    const state = p.state || p.state_code || "";
    const zipCode = p.postcode || "";
    const country = p.country || "Brasil";
    const neighborhood = p.district || p.suburb || p.neighbourhood || "";
    const latitude = f.geometry?.coordinates?.[1] ?? 0;
    const longitude = f.geometry?.coordinates?.[0] ?? 0;
    const number = p.housenumber || "";
    return {
      address,
      city,
      state,
      zipCode,
      country,
      latitude,
      longitude,
      number,
      neighborhood,
    };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setShowSuggestions(true);
    setActiveIndex(-1);
  };

  const handleSuggestionClick = (feature: PhotonFeature) => {
    const addressData = parsePhotonFeature(feature);
    onAddressSelect(addressData);
    const { primary, secondary } = formatSuggestion(feature);
    setInputValue([primary, secondary].filter(Boolean).join(" - "));
    setShowSuggestions(false);
  };

  const handleInputBlur = () => {
    setTimeout(() => setShowSuggestions(false), 200);
  };

  // Destacar termos digitados dentro das sugestões (acessível e seguro)
  const highlightMatch = (text?: string, query?: string) => {
    const t = text || '';
    const q = (query || '').trim();
    if (!q) return <span>{t}</span>;
    try {
      const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
      const parts = t.split(re);
      const matches = t.match(re) || [];
      const nodes: React.ReactNode[] = [];
      for (let i = 0; i < parts.length; i++) {
        nodes.push(<span key={`p-${i}`}>{parts[i]}</span>);
        if (i < matches.length) {
          nodes.push(
            <span key={`m-${i}`} className="bg-accent/20 text-accent-foreground rounded-sm px-0.5 ring-1 ring-border">
              {matches[i]}
            </span>
          );
        }
      }
      return <span className="truncate inline-block align-middle">{nodes}</span>;
    } catch {
      return <span>{t}</span>;
    }
  };

  // Navegação por teclado dentro do dropdown de sugestões
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions && suggestions.length > 0 && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setShowSuggestions(true);
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => {
        const next = prev < suggestions.length - 1 ? prev + 1 : 0;
        return suggestions.length ? next : -1;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => {
        const next = prev > 0 ? prev - 1 : suggestions.length - 1;
        return suggestions.length ? next : -1;
      });
    } else if (e.key === 'Enter') {
      if (showSuggestions && activeIndex >= 0 && activeIndex < suggestions.length) {
        e.preventDefault();
        handleSuggestionClick(suggestions[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative">
      {!hideLabel && (
        <Label htmlFor="address-input" className="text-sm font-medium text-foreground">
          {label}
        </Label>
      )}
      <div className="relative mt-1">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
          <MapPin className="h-4 w-4" />
        </div>
        <Input
          ref={inputRef}
          id="address-input"
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          className={`pl-10 pr-10 rounded-md shadow-sm border-border focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-shadow duration-150 h-11 text-base ${error ? "border-red-500 focus-visible:ring-red-500" : ""}`}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}

      {showSuggestions && (
        <div
          className="absolute left-0 top-full mt-2 w-full bg-card dark:bg-neutral-900 text-foreground border border-border rounded-lg shadow-xl z-50 overflow-y-auto p-2 space-y-2 max-h-80"
          role="listbox"
          id={listboxId}
        >
          {isLoading && (
            <div className="px-4 py-3 flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Buscando endereços…</span>
            </div>
          )}
          {!isLoading && suggestions.length === 0 && (
            <div className="px-4 py-3">
              <p className="text-sm text-muted-foreground">
                {serviceUnavailable ? 'Serviço de endereço indisponível. Digite manualmente.' : 'Nenhum resultado encontrado'}
              </p>
            </div>
          )}
          {!isLoading && suggestions.length > 0 && suggestions.map((s, idx) => {
            const { primary, secondary } = formatSuggestion(s);
            // Criar uma chave única usando múltiplos identificadores
            const coordinates = s.geometry?.coordinates || [0, 0];
            const osmId = s.properties?.osm_id;
            const osmType = s.properties?.osm_type;
            const key = osmId && osmType 
              ? `${osmType}-${osmId}-${coordinates[0]}-${coordinates[1]}-${idx}`
              : `suggestion-${idx}-${coordinates[0]}-${coordinates[1]}-${Date.now()}`;

            return (
              <div
                key={key}
                id={`${listboxId}-opt-${idx}`}
                className={`group px-4 py-2.5 cursor-pointer transition-colors rounded-md ${activeIndex === idx ? 'bg-muted ring-1 ring-primary/30' : 'hover:bg-muted'}`}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(s); }}
                role="option"
                aria-selected={activeIndex === idx}
              >
                <div className="flex items-start space-x-3">
                  <MapPin className="h-4 w-4 text-muted-foreground group-hover:text-primary mt-0.5 flex-shrink-0 transition-colors" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{highlightMatch(primary, inputValue) || "Endereço"}</p>
                    {secondary && (
                      <p className="text-xs text-muted-foreground truncate">{highlightMatch(secondary, inputValue)}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
