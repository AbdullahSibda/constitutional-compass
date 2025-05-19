import { render, screen } from '@testing-library/react';
import { highlightText } from '../components/utils/highlightText';

describe('highlightText', () => {
  const renderHighlight = (text, query) => {
    const result = highlightText(text, query);
    render(<div>{result}</div>);
    return result;
  };

  test('returns original text if query is empty', () => {
    const text = 'Hello world';
    const result = highlightText(text, '');
    expect(result).toBe(text);
  });

  test('returns original text if text is empty', () => {
    const text = '';
    const query = 'hello';
    const result = highlightText(text, query);
    expect(result).toBe(text);
  });

  test('highlights quoted phrases', () => {
    const text = 'This is a test phrase';
    const query = '"test phrase"';
    const result = renderHighlight(text, query);

    expect(result).toEqual([
      'This is a ',
      <mark key={1}>test phrase</mark>,
    ]);
    expect(screen.getByText('test phrase').tagName).toBe('MARK');
  });

  test('respects word boundaries for single words', () => {
    const text = 'Hello helloworld';
    const query = 'hello';
    const result = renderHighlight(text, query);

    expect(result).toEqual([
      <mark key={0}>Hello</mark>,
      ' helloworld',
    ]);
    expect(screen.getByText('Hello').tagName).toBe('MARK');
    expect(screen.queryByText('helloworld')).not.toBeNull();
  });

  test('handles empty search terms gracefully', () => {
    const text = 'Hello world';
    const query = '""   ';
    const result = highlightText(text, query);
    expect(result).toBe(text);
  });

  test('handles case-insensitive matches', () => {
    const text = 'HELLO World';
    const query = 'hello';
    const result = renderHighlight(text, query);

    expect(result).toEqual([
      <mark key={0}>HELLO</mark>,
      ' World',
    ]);
    expect(screen.getByText('HELLO').tagName).toBe('MARK');
  });

  test('filters out null parts', () => {
    const text = 'hello';
    const query = 'hello';
    const result = renderHighlight(text, query);

    expect(result).toEqual([<mark key={0}>hello</mark>]);
    expect(screen.getByText('hello').tagName).toBe('MARK');
  });
});