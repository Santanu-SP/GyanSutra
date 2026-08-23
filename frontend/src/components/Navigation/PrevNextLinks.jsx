import { Link } from 'react-router-dom';

export default function PrevNextLinks({ prevTo, prevLabel, nextTo, nextLabel }) {
  return (
    <div className="mt-8 flex items-center justify-between gap-4 border-t border-[color:var(--border)] pt-6">
      <div className="flex-1 text-left">
        {prevTo && (
          <Link 
            to={prevTo} 
            rel="prev"
            className="group inline-flex items-center gap-2 text-sm font-medium text-[color:var(--text-secondary)] hover:text-[color:var(--accent)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 rounded p-1"
          >
            <svg className="h-4 w-4 flex-shrink-0 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="truncate max-w-[120px] sm:max-w-[200px]">{prevLabel}</span>
          </Link>
        )}
      </div>
      <div className="flex-1 text-right">
        {nextTo && (
          <Link 
            to={nextTo} 
            rel="next"
            className="group inline-flex flex-row-reverse items-center gap-2 text-sm font-medium text-[color:var(--text-secondary)] hover:text-[color:var(--accent)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 rounded p-1"
          >
            <svg className="h-4 w-4 flex-shrink-0 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <span className="truncate max-w-[120px] sm:max-w-[200px]">{nextLabel}</span>
          </Link>
        )}
      </div>
    </div>
  );
}
