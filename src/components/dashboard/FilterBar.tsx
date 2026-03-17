import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useData } from '@/contexts/DataContext';
import { cn } from '@/lib/utils';

export function FilterBar() {
  const { parsedData, filters, updateFilters } = useData();
  
  if (!parsedData) return null;
  
  const hasFilters = 
    filters.dateDebut || 
    filters.dateFin || 
    filters.commercial || 
    filters.famille || 
    filters.client;
  
  const clearFilters = () => {
    updateFilters({
      dateDebut: null,
      dateFin: null,
      commercial: null,
      famille: null,
      client: null,
    });
  };
  
  return (
    <div className="filter-bar">
      {/* Date début */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-[160px] justify-start text-left font-normal',
              !filters.dateDebut && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {filters.dateDebut ? (
              format(filters.dateDebut, 'dd MMM yyyy', { locale: fr })
            ) : (
              'Date début'
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={filters.dateDebut ?? undefined}
            onSelect={(date) => updateFilters({ dateDebut: date ?? null })}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      
      {/* Date fin */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-[160px] justify-start text-left font-normal',
              !filters.dateFin && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {filters.dateFin ? (
              format(filters.dateFin, 'dd MMM yyyy', { locale: fr })
            ) : (
              'Date fin'
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={filters.dateFin ?? undefined}
            onSelect={(date) => updateFilters({ dateFin: date ?? null })}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      
      {/* Commercial */}
      <Select
        value={filters.commercial ?? '__all__'}
        onValueChange={(val) => updateFilters({ commercial: val === '__all__' ? null : val })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Commercial" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Tous les commerciaux</SelectItem>
          {parsedData.commerciaux.map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* Famille */}
      <Select
        value={filters.famille ?? '__all__'}
        onValueChange={(val) => updateFilters({ famille: val === '__all__' ? null : val })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Famille" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Toutes les familles</SelectItem>
          {parsedData.familles.map((f) => (
            <SelectItem key={f} value={f}>{f}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* Client */}
      <Select
        value={filters.client ?? '__all__'}
        onValueChange={(val) => updateFilters({ client: val === '__all__' ? null : val })}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Client" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Tous les clients</SelectItem>
          {parsedData.clients.slice(0, 100).map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
          {parsedData.clients.length > 100 && (
            <SelectItem value="__more__" disabled>
              +{parsedData.clients.length - 100} autres...
            </SelectItem>
          )}
        </SelectContent>
      </Select>
      
      {/* Clear filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="ml-auto"
        >
          <X className="mr-2 h-4 w-4" />
          Effacer filtres
        </Button>
      )}
    </div>
  );
}
