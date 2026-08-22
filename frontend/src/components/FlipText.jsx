import React, { useMemo } from 'react';

/**
 * FlipText component from Vengeance UI (adapted for JS)
 * Animates text characters with a flipping motion.
 */
export default function FlipText({
    className = '',
    children,
    duration = 2.2,
    delay = 0,
    loop = true,
    separator = ' ',
    together = false,
}) {
    const words = useMemo(() => {
        if (typeof children !== 'string') return [];
        return children.split(separator);
    }, [children, separator]);
    
    const totalChars = typeof children === 'string' ? children.length : 0;

    // Calculate character index for each position
    const getCharIndex = (wordIndex, charIndex) => {
        let index = 0;
        for (let i = 0; i < wordIndex; i++) {
            index += words[i].length + (separator === ' ' ? 1 : separator.length);
        }
        return index + charIndex;
    };

    if (typeof children !== 'string') {
        return <span className={className}>{children}</span>;
    }

    return (
        <div
            className={`flip-text-wrapper inline-block leading-none ${className}`}
            style={{ perspective: '1000px' }}
        >
            {words.map((word, wordIndex) => {
                const chars = word.split('');

                return (
                    <span
                        key={wordIndex}
                        className="word inline-block whitespace-nowrap"
                        style={{ transformStyle: 'preserve-3d' }}
                    >
                        {chars.map((char, charIndex) => {
                            const currentGlobalIndex = getCharIndex(wordIndex, charIndex);

                            // Calculate delay - if together, use same delay for all
                            let calculatedDelay = delay;
                            if (!together) {
                                const normalizedIndex = currentGlobalIndex / totalChars;
                                const sineValue = Math.sin(normalizedIndex * (Math.PI / 2));
                                calculatedDelay = sineValue * (duration * 0.25) + delay;
                            }

                            return (
                                <span
                                    key={charIndex}
                                    className="flip-char inline-block relative"
                                    data-char={char}
                                    style={{
                                        '--flip-duration': `${duration}s`,
                                        '--flip-delay': `${calculatedDelay}s`,
                                        '--flip-iteration': loop ? 'infinite' : '1',
                                        transformStyle: 'preserve-3d',
                                    }}
                                >
                                    {char}
                                </span>
                            );
                        })}
                        {separator === ' ' && wordIndex < words.length - 1 && (
                            <span className="whitespace inline-block">&nbsp;</span>
                        )}
                        {separator !== ' ' && wordIndex < words.length - 1 && (
                            <span className="separator inline-block">{separator}</span>
                        )}
                    </span>
                );
            })}
        </div>
    );
}
