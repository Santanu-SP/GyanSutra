/**
 * ChapterNav — book-edge tab strip.
 *
 * Renders 18 chapter tabs along the left edge on desktop,
 * or as a horizontal scrollable strip on mobile.
 * Deliberately NOT a grid — it reads like tabbed page-edges on a physical book.
 */

import { NavLink } from 'react-router-dom';
import './ChapterNav.css';

const CHAPTER_LABELS = [
  { num: 1,  short: 'I' },
  { num: 2,  short: 'II' },
  { num: 3,  short: 'III' },
  { num: 4,  short: 'IV' },
  { num: 5,  short: 'V' },
  { num: 6,  short: 'VI' },
  { num: 7,  short: 'VII' },
  { num: 8,  short: 'VIII' },
  { num: 9,  short: 'IX' },
  { num: 10, short: 'X' },
  { num: 11, short: 'XI' },
  { num: 12, short: 'XII' },
  { num: 13, short: 'XIII' },
  { num: 14, short: 'XIV' },
  { num: 15, short: 'XV' },
  { num: 16, short: 'XVI' },
  { num: 17, short: 'XVII' },
  { num: 18, short: 'XVIII' },
];

export default function ChapterNav({ compact = false }) {
  return (
    <nav
      className={`chapter-nav ${compact ? 'chapter-nav--compact' : ''}`}
      aria-label="Chapter navigation"
    >
      <div className="chapter-nav__label">
        <span>Adhyāya</span>
      </div>
      <ol className="chapter-nav__list">
        {CHAPTER_LABELS.map(({ num, short }) => (
          <li key={num} className="chapter-nav__item">
            <NavLink
              to={`/chapters/chapter_${num}`}
              className={({ isActive }) =>
                `chapter-nav__tab ${isActive ? 'chapter-nav__tab--active' : ''}`
              }
              aria-label={`Chapter ${num}`}
              id={`chapter-nav-tab-${num}`}
            >
              <span className="chapter-nav__num">{short}</span>
            </NavLink>
          </li>
        ))}
      </ol>
    </nav>
  );
}
