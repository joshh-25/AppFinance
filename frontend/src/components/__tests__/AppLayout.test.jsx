// Finance App File: frontend\src\components\__tests__\AppLayout.test.jsx
// Purpose: Frontend/support source file for the Finance app.

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import AppLayout from '../AppLayout.jsx';

describe('AppLayout', () => {
  it('renders title, subtitle, and child content', () => {
    render(
      <MemoryRouter initialEntries={['/records']}>
        <AppLayout title="Records" subtitle="Search and manage records.">
          <div>Layout Child</div>
        </AppLayout>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Records' })).toBeInTheDocument();
    expect(screen.getByText('Search and manage records.')).toBeInTheDocument();
    expect(screen.getByText('Layout Child')).toBeInTheDocument();
    expect(screen.getByText('Property Records')).toBeInTheDocument();
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });
});
