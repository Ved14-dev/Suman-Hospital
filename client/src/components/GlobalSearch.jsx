import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Phone, Hash, Loader2 } from 'lucide-react';
import { quickSearchPatients } from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const GlobalSearch = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Keyboard shortcut listener: '/' or 'Ctrl+K'
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') ||
          (e.key === 'k' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!token || !query || query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await quickSearchPatients(token, query.trim());
        if (res.success) {
          setResults(res.data || []);
          setIsOpen(true);
        }
      } catch (err) {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, token]);

  const handleSelectPatient = (patient) => {
    setIsOpen(false);
    setQuery('');
    // Role-aware navigation
    if (user?.role === 'patient') {
      navigate('/patient-dashboard');
    } else {
      navigate(`/portal/patients/${patient._id}`);
    }
  };

  // Patients do not see global search across other patients
  if (user?.role === 'patient') {
    return null;
  }

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
          placeholder="Search patient by UHID, name, phone..."
          className="w-full pl-9 pr-20 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all placeholder:text-slate-400 font-medium"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 text-teal-600 animate-spin" />
          ) : (
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-400 bg-slate-200/80 rounded border border-slate-300">
              Ctrl+K
            </kbd>
          )}
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 max-h-80 overflow-y-auto divide-y divide-slate-100"
        >
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-slate-500">
              No matching patient records found for "{query}".
            </div>
          ) : (
            results.map((patient) => (
              <button
                key={patient._id}
                onClick={() => handleSelectPatient(patient)}
                className="w-full px-4 py-2.5 text-left hover:bg-teal-50/40 flex items-center justify-between gap-3 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                      {patient.name}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {patient.phone}
                      </span>
                      {patient.gender && (
                        <span>· {patient.gender} {patient.approxAge ? `(${patient.approxAge}y)` : ''}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-mono text-[11px] font-bold group-hover:bg-teal-100 group-hover:text-teal-800 transition-colors">
                    {patient.uhid}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
