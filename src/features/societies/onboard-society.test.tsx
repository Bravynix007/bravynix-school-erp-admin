import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as SocietiesApiModule from './societies-api';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/api-error';
import { renderScreen } from '@/test/render';
import { society } from '@/test/societies';
import { OnboardSociety } from './onboard-society';

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(),
}));

const api = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('./societies-api', async (original) => ({
  ...(await original<typeof SocietiesApiModule>()),
  societiesApi: api,
}));

beforeEach(() => {
  api.create.mockReset();
  replace.mockReset();
});

const next = () => userEvent.click(screen.getByRole('button', { name: 'Save and continue' }));

async function fillProfile() {
  await userEvent.type(screen.getByLabelText(/Society name/), 'Sunrise Trust');
  await userEvent.type(screen.getByLabelText(/^Code/), 'SUNRISE');
  await next();
}

describe('OnboardSociety', () => {
  it('asks for the name and code before leaving the profile step', async () => {
    renderScreen(<OnboardSociety />);
    await next();
    expect(screen.getByText('Enter the Society name.')).toBeInTheDocument();
    expect(screen.getByText('Enter a code. It cannot be changed later.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Owners' })).not.toBeInTheDocument();
  });

  it('adds up to three Owners, one at least, and checks their emails', async () => {
    renderScreen(<OnboardSociety />);
    await fillProfile();
    expect(screen.getByRole('button', { name: 'Remove Owner 1' })).toBeDisabled();
    await next();
    expect(screen.getByText('Enter the Owner’s email.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Add Owner' }));
    await userEvent.click(screen.getByRole('button', { name: 'Add Owner' }));
    expect(screen.queryByRole('button', { name: 'Add Owner' })).not.toBeInTheDocument();
    expect(screen.getByText(/3 of 3 Owners/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Remove Owner 3' }));
    expect(screen.getByRole('button', { name: 'Add Owner' })).toBeInTheDocument();
  });

  it('reviews the entries and creates the Society with its Owners in one call, then opens it', async () => {
    api.create.mockResolvedValue(society({ id: 'new-1', name: 'Sunrise Trust' }));
    renderScreen(<OnboardSociety />);
    await fillProfile();
    await userEvent.type(screen.getByLabelText('Owner 1 first name'), 'Asha');
    await userEvent.type(screen.getByLabelText(/Owner 1 email/), 'Asha@Example.org');
    await next();

    expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByText('Sunrise Trust')).toBeInTheDocument();
    expect(screen.getByText('Asha@Example.org')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Onboard Society' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/societies/workspace?id=new-1'));
    expect(api.create).toHaveBeenCalledWith({
      name: 'Sunrise Trust',
      code: 'SUNRISE',
      owners: [{ email: 'asha@example.org', firstName: 'Asha' }],
    });
  });

  it('sends the write once when Onboard Society is clicked twice, and again after a refusal', async () => {
    let refuse: (error: ApiError) => void = () => {};
    api.create
      .mockImplementationOnce(() => new Promise((_, reject) => (refuse = reject)))
      .mockResolvedValue(society());
    renderScreen(<OnboardSociety />);
    await fillProfile();
    await userEvent.type(screen.getByLabelText(/Owner 1 email/), 'a@example.org');
    await next();

    // Both clicks land before React re-renders the button as disabled, as in a real double click.
    const button = screen.getByRole('button', { name: 'Onboard Society' });
    act(() => {
      button.click();
      button.click();
    });
    await waitFor(() => expect(api.create).toHaveBeenCalledTimes(1));

    refuse(new ApiError(409, 'ACCOUNT_BLOCKED', 'x', 'req-5'));
    await screen.findByText('ACCOUNT_BLOCKED');
    await userEvent.click(screen.getByRole('button', { name: 'Onboard Society' }));
    await waitFor(() => expect(api.create).toHaveBeenCalledTimes(2));
  });

  it('returns to the profile when the code is taken, with the error on the code field', async () => {
    api.create.mockRejectedValue(
      new ApiError(409, 'DUPLICATE', 'x', 'r', [
        { field: 'code', code: 'DUPLICATE', message: 'This code is taken' },
      ]),
    );
    renderScreen(<OnboardSociety />);
    await fillProfile();
    await userEvent.type(screen.getByLabelText(/Owner 1 email/), 'a@example.org');
    await next();
    await userEvent.click(screen.getByRole('button', { name: 'Onboard Society' }));

    expect(await screen.findByText('This code is taken')).toBeInTheDocument();
    expect(screen.getByLabelText(/Society name/)).toHaveValue('Sunrise Trust');
    expect(replace).not.toHaveBeenCalled();
  });

  it('returns to the Owners step with the error on the email that was refused', async () => {
    api.create.mockRejectedValue(
      new ApiError(409, 'DUPLICATE', 'x', 'r', [
        { field: 'owners[0].email', code: 'DUPLICATE', message: 'Named twice' },
      ]),
    );
    renderScreen(<OnboardSociety />);
    await fillProfile();
    await userEvent.type(screen.getByLabelText(/Owner 1 email/), 'a@example.org');
    await next();
    await userEvent.click(screen.getByRole('button', { name: 'Onboard Society' }));
    expect(await screen.findByText('Named twice')).toBeInTheDocument();
  });

  it('shows a refusal without a field on the review step, with its code', async () => {
    api.create.mockRejectedValue(new ApiError(409, 'ACCOUNT_BLOCKED', 'x', 'req-5'));
    renderScreen(<OnboardSociety />);
    await fillProfile();
    await userEvent.type(screen.getByLabelText(/Owner 1 email/), 'a@example.org');
    await next();
    await userEvent.click(screen.getByRole('button', { name: 'Onboard Society' }));
    const alert = (await screen.findByText('ACCOUNT_BLOCKED')).closest('[role="alert"]') as HTMLElement;
    expect(within(alert).getByText('This account is blocked.')).toBeInTheDocument();
  });

  it('lets a finished step be reopened from the stepper', async () => {
    renderScreen(<OnboardSociety />);
    await fillProfile();
    await userEvent.click(screen.getByRole('button', { name: /Profile/ }));
    expect(screen.getByLabelText(/Society name/)).toHaveValue('Sunrise Trust');
  });

  describe('focus', () => {
    const stepHeading = (name: string) => screen.getByRole('heading', { name, level: 2 });

    async function reachReview() {
      await fillProfile();
      await userEvent.type(screen.getByLabelText(/Owner 1 email/), 'asha@example.org');
      await next();
    }

    it('moves to the step heading when the step changes, forwards, back and from the Stepper', async () => {
      renderScreen(<OnboardSociety />);
      await fillProfile();
      expect(stepHeading('Step 2 of 3: Owners')).toHaveFocus();
      await userEvent.click(screen.getByRole('button', { name: 'Back' }));
      expect(stepHeading('Step 1 of 3: Profile')).toHaveFocus();
      await next();
      await userEvent.type(screen.getByLabelText(/Owner 1 email/), 'asha@example.org');
      await next();
      expect(stepHeading('Step 3 of 3: Review')).toHaveFocus();
      await userEvent.click(screen.getByRole('button', { name: /Step 1, done/ }));
      expect(stepHeading('Step 1 of 3: Profile')).toHaveFocus();
    });

    it('moves to the heading when Review sends the operator back to edit', async () => {
      renderScreen(<OnboardSociety />);
      await reachReview();
      await userEvent.click(screen.getByRole('button', { name: 'Edit profile' }));
      expect(stepHeading('Step 1 of 3: Profile')).toHaveFocus();
      await next();
      await next();
      await userEvent.click(screen.getByRole('button', { name: 'Edit Owners' }));
      expect(stepHeading('Step 2 of 3: Owners')).toHaveFocus();
    });

    it('does not take focus when the screen opens', () => {
      renderScreen(<OnboardSociety />);
      expect(stepHeading('Step 1 of 3: Profile')).not.toHaveFocus();
    });

    it('after Remove, goes to the field of the Owner who took the place, or to Add Owner for the last', async () => {
      renderScreen(<OnboardSociety />);
      await fillProfile();
      await userEvent.click(screen.getByRole('button', { name: 'Add Owner' }));
      await userEvent.click(screen.getByRole('button', { name: 'Add Owner' }));
      await userEvent.type(screen.getByLabelText(/Owner 2 email/), 'two@example.org');
      await userEvent.type(screen.getByLabelText(/Owner 3 email/), 'three@example.org');

      await userEvent.click(screen.getByRole('button', { name: 'Remove Owner 2' }));
      expect(screen.getByLabelText(/Owner 2 email/)).toHaveValue('three@example.org');
      expect(screen.getByLabelText(/Owner 2 email/)).toHaveFocus();

      await userEvent.click(screen.getByRole('button', { name: 'Remove Owner 2' }));
      expect(screen.getByRole('button', { name: 'Add Owner' })).toHaveFocus();
    });
  });

  it('drops the Owner errors with a removed row, so none lands on a valid email', async () => {
    renderScreen(<OnboardSociety />);
    await fillProfile();
    await userEvent.type(screen.getByLabelText(/Owner 1 email/), 'a@example.org');
    await userEvent.click(screen.getByRole('button', { name: 'Add Owner' }));
    await userEvent.type(screen.getByLabelText(/Owner 2 email/), 'bad');
    await userEvent.click(screen.getByRole('button', { name: 'Add Owner' }));
    await userEvent.type(screen.getByLabelText(/Owner 3 email/), 'c@example.org');
    await next();
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Remove Owner 1' }));
    expect(screen.queryByText('Enter a valid email address.')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Owner 2 email/)).toHaveValue('c@example.org');
    expect(screen.getByLabelText(/Owner 2 email/)).not.toBeInvalid();
    await next();
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Owner 1 email/)).toBeInvalid();
  });

  it('gives the icon-only Remove button a tooltip as well as a name', async () => {
    renderScreen(<OnboardSociety />);
    await fillProfile();
    expect(screen.getByRole('button', { name: 'Remove Owner 1' })).toHaveAttribute('title', 'Remove Owner 1');
  });
});
