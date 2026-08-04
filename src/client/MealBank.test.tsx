import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Meal } from "../shared/meal";
import { MealBank } from "./MealBank";
import { aMeal, aSlug, answerInTurn } from "./test-fixtures";

const lasagne: Meal = { id: "meal-2", name: "Lasagne", description: null };

const HoldingBank = ({ held }: { held: Meal[] }) => {
  const [meals, setMeals] = useState(held);
  return <MealBank slug={aSlug} meals={meals} onChange={setMeals} />;
};

const showBank = (meals: Meal[] = []) => render(<HoldingBank held={meals} />);

const typeName = (name: string) =>
  userEvent.type(screen.getByLabelText(/meal/i), name);

const pressAdd = () =>
  userEvent.click(screen.getByRole("button", { name: /^add$/i }));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the Meal Bank", () => {
  it("counts what it holds", () => {
    showBank([aMeal, lasagne]);

    expect(screen.getByText("2 Meals")).toBeInTheDocument();
  });

  it("counts a single Meal in the singular", () => {
    showBank([aMeal]);

    expect(screen.getByText("1 Meal")).toBeInTheDocument();
  });

  it("lists every Meal it holds with its description", () => {
    showBank([aMeal, lasagne]);

    expect(screen.getByText(aMeal.name)).toBeInTheDocument();
    expect(screen.getByText(String(aMeal.description))).toBeInTheDocument();
    expect(screen.getByText(lasagne.name)).toBeInTheDocument();
  });

  it("points an empty Bank at adding the first Meal", () => {
    showBank();

    expect(screen.getByText(/no meals yet/i)).toBeInTheDocument();
  });

  it("adds a Meal without sending the rest of the Bank", async () => {
    answerInTurn({ body: lasagne, status: 201 });
    showBank([aMeal]);

    await typeName("Lasagne");
    await pressAdd();

    expect(await screen.findByText("Lasagne")).toBeInTheDocument();
    const [url, options] = vi.mocked(globalThis.fetch).mock.calls[0] ?? [];
    expect(url).toBe(`/api/households/${aSlug}/meals`);
    expect(options?.body).toBe(
      JSON.stringify({ name: "Lasagne", description: "" }),
    );
  });

  it("empties the form after a Meal lands, ready for the next one", async () => {
    answerInTurn({ body: lasagne, status: 201 });
    showBank();

    await typeName("Lasagne");
    await pressAdd();

    await screen.findByText("Lasagne");
    expect(screen.getByLabelText(/meal/i)).toHaveValue("");
  });

  it("says why a duplicate was refused and keeps what was typed", async () => {
    answerInTurn({
      body: { error: "duplicate_meal", message: "That Meal is already in it." },
      status: 409,
    });
    showBank([aMeal]);

    await typeName("butter chicken");
    await pressAdd();

    expect(await screen.findByRole("alert")).toHaveTextContent(/already/i);
    expect(screen.getByLabelText(/meal/i)).toHaveValue("butter chicken");
  });

  it("will not send a Meal with no name", async () => {
    answerInTurn({ body: lasagne, status: 201 });
    showBank();

    await pressAdd();

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("edits a Meal in place", async () => {
    const edited = { ...aMeal, name: "Butter Chicken" };
    answerInTurn({ body: edited });
    showBank([aMeal]);

    await userEvent.click(
      screen.getByRole("button", { name: `Edit ${aMeal.name}` }),
    );
    const name = screen.getByLabelText(/^name$/i);
    await userEvent.clear(name);
    await userEvent.type(name, "Butter Chicken");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText("Butter Chicken")).toBeInTheDocument();
    const [url, options] = vi.mocked(globalThis.fetch).mock.calls[0] ?? [];
    expect(url).toBe(`/api/households/${aSlug}/meals/${aMeal.id}`);
    expect(options?.method).toBe("PATCH");
  });

  it("leaves the Meal as it was when an edit is abandoned", async () => {
    answerInTurn({ body: aMeal });
    showBank([aMeal]);

    await userEvent.click(
      screen.getByRole("button", { name: `Edit ${aMeal.name}` }),
    );
    const name = screen.getByLabelText(/^name$/i);
    await userEvent.clear(name);
    await userEvent.type(name, "Something else");
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.getByText(aMeal.name)).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("deletes a Meal only once the deletion is confirmed", async () => {
    answerInTurn({ status: 204 });
    showBank([aMeal, lasagne]);

    await userEvent.click(
      screen.getByRole("button", { name: `Delete ${aMeal.name}` }),
    );
    expect(globalThis.fetch).not.toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole("button", { name: `Yes, delete ${aMeal.name}` }),
    );

    await vi.waitFor(() =>
      expect(screen.queryByText(aMeal.name)).not.toBeInTheDocument(),
    );
    expect(screen.getByText(lasagne.name)).toBeInTheDocument();
    const [url, options] = vi.mocked(globalThis.fetch).mock.calls[0] ?? [];
    expect(url).toBe(`/api/households/${aSlug}/meals/${aMeal.id}`);
    expect(options?.method).toBe("DELETE");
  });

  it("says so when the Bank cannot be reached", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    showBank();

    await typeName("Lasagne");
    await pressAdd();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /something went wrong/i,
    );
  });
});
