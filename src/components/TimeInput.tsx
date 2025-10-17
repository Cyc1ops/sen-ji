import { useState, useRef, KeyboardEvent, ChangeEvent } from 'react'

interface TimeInputProps {
  value: string // 格式: "HH:MM"
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export default function TimeInput({ value, onChange, placeholder = '00:00', className = '' }: TimeInputProps) {
  // 确保 value 格式正确，如果没有冒号则补充
  const normalizedValue = value.includes(':') ? value : `${value}:`
  const parts = normalizedValue.split(':')
  const hours = parts[0] || ''
  const minutes = parts[1] || ''
  
  const hoursRef = useRef<HTMLInputElement>(null)
  const minutesRef = useRef<HTMLInputElement>(null)

  const handleHoursChange = (e: ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '') // 只保留数字
    
    // 限制最多4位数字（最多9999小时）
    if (val.length > 4) {
      val = val.slice(0, 4)
    }
    
    // 如果输入2位数字，自动跳转到分钟
    if (val.length === 2 && parseInt(val) < 24) {
      minutesRef.current?.focus()
    }
    
    // 确保分钟部分不是 undefined
    const currentMinutes = minutes || ''
    const newValue = `${val}:${currentMinutes}`
    onChange(newValue)
  }

  const handleMinutesChange = (e: ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '') // 只保留数字
    
    // 限制最多2位数字
    if (val.length > 2) {
      val = val.slice(0, 2)
    }
    
    // 限制分钟不超过59
    if (val.length === 2 && parseInt(val) > 59) {
      val = '59'
    }
    
    // 确保小时部分不是 undefined
    const currentHours = hours || ''
    const newValue = `${currentHours}:${val}`
    onChange(newValue)
  }

  const handleHoursKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab' || e.key === ':') {
      e.preventDefault()
      minutesRef.current?.focus()
    } else if (e.key === 'ArrowRight') {
      minutesRef.current?.focus()
    }
  }

  const handleMinutesKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowLeft' && minutesRef.current?.selectionStart === 0) {
      hoursRef.current?.focus()
    } else if (e.key === 'Backspace' && !minutes) {
      hoursRef.current?.focus()
    }
  }

  const handleHoursFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select()
  }

  const handleMinutesFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select()
  }

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
        <div className="flex flex-col items-center">
          <input
            ref={hoursRef}
            type="text"
            inputMode="numeric"
            value={hours}
            onChange={handleHoursChange}
            onKeyDown={handleHoursKeyDown}
            onFocus={handleHoursFocus}
            placeholder="00"
            className="w-16 text-center text-2xl font-mono outline-none border-none bg-transparent"
            maxLength={4}
          />
          <span className="text-xs text-gray-500 mt-1">小时</span>
        </div>
        
        <span className="text-2xl font-mono text-gray-400">:</span>
        
        <div className="flex flex-col items-center">
          <input
            ref={minutesRef}
            type="text"
            inputMode="numeric"
            value={minutes}
            onChange={handleMinutesChange}
            onKeyDown={handleMinutesKeyDown}
            onFocus={handleMinutesFocus}
            placeholder="00"
            className="w-16 text-center text-2xl font-mono outline-none border-none bg-transparent"
            maxLength={2}
          />
          <span className="text-xs text-gray-500 mt-1">分钟</span>
        </div>
      </div>
    </div>
  )
}

