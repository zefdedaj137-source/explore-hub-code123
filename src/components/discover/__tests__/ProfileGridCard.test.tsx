import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProfileGridCard } from "@/components/discover/ProfileGridCard";
import type { Profile } from "@/types/profile";

const makeProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: "1",
  full_name: "Jane Doe",
  age: 28,
  gender: "female",
  location: "LA",
  city: "Los Angeles",
  country: "US",
  bio: "Hello!",
  interests: ["hiking"],
  profile_image_url: "https://example.com/photo.jpg",
  verified: true,
  zodiac_sign: null,
  religion: null,
  latitude: null,
  longitude: null,
  ...overrides,
});

describe("ProfileGridCard", () => {
  it("renders name and age", () => {
    render(<ProfileGridCard profile={makeProfile()} onClick={() => {}} />);
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("28")).toBeInTheDocument();
  });

  it("renders city", () => {
    render(<ProfileGridCard profile={makeProfile()} onClick={() => {}} />);
    expect(screen.getByText("Los Angeles")).toBeInTheDocument();
  });

  it("shows travel city when travel mode active", () => {
    const profile = makeProfile({
      travel_mode_active: true,
      travel_city: "Tokyo",
    });
    render(<ProfileGridCard profile={profile} onClick={() => {}} />);
    expect(screen.getByText("Tokyo")).toBeInTheDocument();
  });

  it("shows fallback initial when no photo", () => {
    const profile = makeProfile({ profile_image_url: null });
    render(<ProfileGridCard profile={profile} onClick={() => {}} />);
    expect(screen.getByText("J")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const handleClick = vi.fn();
    render(<ProfileGridCard profile={makeProfile()} onClick={handleClick} />);
    fireEvent.click(screen.getByText("Jane Doe"));
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
