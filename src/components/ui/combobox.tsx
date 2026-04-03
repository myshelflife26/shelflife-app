import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface ComboboxProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  emptyMessage?: string
  className?: string
  id?: string
  name?: string
  required?: boolean
}

export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Select option...",
  emptyMessage = "No option found.",
  className,
  id,
  name,
  required
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(value)
  const [isSearching, setIsSearching] = React.useState(false)

  // Sync inputValue with external value prop
  React.useEffect(() => {
    setInputValue(value)
  }, [value])

  // Filter options based on input - only filter when actively searching
  const filteredOptions = React.useMemo(() => {
    if (!isSearching || !inputValue) return options
    return options.filter(option =>
      option.toLowerCase().includes(inputValue.toLowerCase())
    )
  }, [options, inputValue, isSearching])

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue)
    setInputValue(selectedValue)
    setIsSearching(false)
    setOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setIsSearching(true)
    onChange(newValue)
    setOpen(true)
  }

  const handleInputFocus = () => {
    setIsSearching(false)
    setOpen(true)
  }

  const handleInputBlur = () => {
    // Delay to allow clicking on options
    setTimeout(() => {
      setOpen(false)
      setIsSearching(false)
      // Restore the value if nothing was selected
      if (isSearching) {
        setInputValue(value)
      }
    }, 200)
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          id={id}
          name={name}
          required={required}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-8",
            className
          )}
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          autoComplete="off"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setIsSearching(false)
            setOpen(!open)
          }}
        >
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </div>

      {open && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
          {filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-sm">{emptyMessage}</div>
          ) : (
            <div className="p-1">
              {filteredOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={cn(
                    "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                    value === option && "bg-accent"
                  )}
                  onClick={() => handleSelect(option)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
