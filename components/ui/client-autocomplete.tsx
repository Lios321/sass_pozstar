"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Loader2, Phone, Search } from "lucide-react";
import { useRouter } from "next/navigation";

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface ClientAutocompleteProps {
  onClientSelect: (client: Client) => void;
  placeholder?: string;
  label?: string;
  value?: string;
  error?: string;
  required?: boolean;
}

export default function ClientAutocomplete({
  onClientSelect,
  placeholder = "Digite o nome do cliente...",
  label = "Cliente",
  value = "",
  error,
  required = false,
}: ClientAutocompleteProps) {
  const router = useRouter();
  const [inputValue, setInputValue] = useState(value);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Client[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce de busca
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (inputValue && inputValue.length >= 2) {
      debounceRef.current = window.setTimeout(() => {
        searchClients(inputValue);
      }, 300);
    } else {
      setSuggestions([]);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue]);

  const searchClients = async (query: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/clients?search=${encodeURIComponent(query)}&limit=10`);
      if (!response.ok) {
        throw new Error('Erro ao buscar clientes');
      }
      const data: any = await response.json();
      setSuggestions(data.clients || []);
    } catch (err) {
      console.error("Erro ao buscar clientes:", err);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (client: Client) => {
    onClientSelect(client);
    setInputValue(client.name);
    setShowSuggestions(false);
  };
  
  const goToCreateClient = () => {
    const returnTo = encodeURIComponent('/dashboard/service-orders/nova');
    const prefillName = encodeURIComponent(inputValue.trim());
    router.push(`/dashboard/clients/new?return=${returnTo}&prefillName=${prefillName}`);
  };

  const handleInputBlur = () => {
    setTimeout(() => setShowSuggestions(false), 200);
  };

  return (
    <div className="relative">
      <Label htmlFor="client-input" className="text-gray-700 dark:text-gray-300 flex items-center space-x-1">
        <span>{label}</span>
        {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative mt-1">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
          <User className="h-4 w-4" />
        </div>
        <Input
          ref={inputRef}
          id="client-input"
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          className={`pl-10 pr-10 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${error ? "border-red-500" : ""}`}
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-500 dark:text-gray-400" />
          ) : (
            <Search className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}

      {showSuggestions && suggestions.length > 0 && typeof window !== 'undefined' && 
        createPortal(
          <div 
            className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[9999] max-h-60 overflow-y-auto"
            style={{
              top: `${(inputRef.current?.getBoundingClientRect()?.bottom ?? 0) + window.scrollY + 4}px`,
              left: `${(inputRef.current?.getBoundingClientRect()?.left ?? 0) + window.scrollX}px`,
              width: `${inputRef.current?.getBoundingClientRect()?.width ?? 0}px`
            }}
          >
            {suggestions.map((client) => (
              <div
                key={client.id}
                className="px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-b-0 transition-colors"
                onClick={() => handleSuggestionClick(client)}
              >
                <div className="flex items-start space-x-3">
                  <User className="h-4 w-4 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{client.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{client.email}</p>
                    {client.phone && (
                      <div className="flex items-center space-x-1 mt-1">
                        <Phone className="h-3 w-3 text-gray-400" />
                        <p className="text-xs text-gray-500 dark:text-gray-400">{client.phone}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>,
          document.body
        )
      }
      
      {showSuggestions && suggestions.length === 0 && inputValue.trim().length >= 2 && typeof window !== 'undefined' &&
        createPortal(
          <div
            className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[9999] overflow-hidden"
            style={{
              top: `${(inputRef.current?.getBoundingClientRect()?.bottom ?? 0) + window.scrollY + 4}px`,
              left: `${(inputRef.current?.getBoundingClientRect()?.left ?? 0) + window.scrollX}px`,
              width: `${inputRef.current?.getBoundingClientRect()?.width ?? 0}px`
            }}
          >
            <div className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
              Nenhum cliente encontrado para “{inputValue.trim()}”
            </div>
            <button
              type="button"
              onClick={goToCreateClient}
              className="w-full text-left px-4 py-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cadastrar novo cliente
            </button>
          </div>,
          document.body
        )
      }
    </div>
  );
}
