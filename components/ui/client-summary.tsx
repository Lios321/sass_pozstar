"use client";

import { User, Phone, Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface ClientSummaryProps {
  client: Client;
  onRemove?: () => void;
  showRemoveButton?: boolean;
}

export default function ClientSummary({ 
  client, 
  onRemove, 
  showRemoveButton = false 
}: ClientSummaryProps) {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-2">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-800/50 rounded-full">
            <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 truncate">
              {client.name}
            </h4>
            <div className="space-y-1 mt-1">
              {client.phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs text-blue-700 dark:text-blue-300">{client.phone}</span>
                </div>
              )}
              {client.email && (
                <div className="flex items-center space-x-2">
                  <Mail className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs text-blue-700 dark:text-blue-300 truncate">{client.email}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        {showRemoveButton && onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-6 w-6 p-0 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-800/50"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}