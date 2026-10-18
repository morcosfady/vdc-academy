"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Accordion, SegmentedControl, Stepper, Tabs, Toggle } from "./Controls";
import { Input, Select, FileDrop } from "./Forms";
import { Modal, Toast } from "./Overlays";
import { Chip } from "./Chips";

// Interactive samples for /styleguide. Rendered once per theme so light and dark variants sit side by side.
export function ControlsDemo() {
  const [tab, setTab] = useState("all");
  const [lod, setLod] = useState("350");
  const [grad, setGrad] = useState(true);
  const [chips, setChips] = useState("revit");
  return (
    <div className="space-y-10">
      <Tabs
        label="Program track"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "all", label: "All" },
          { id: "found", label: "Foundations" },
          { id: "model", label: "Modeling" },
          { id: "coord", label: "Coordination" },
        ]}
      />
      <div className="flex flex-wrap items-center gap-6">
        <SegmentedControl
          label="Level of development"
          value={lod}
          onChange={setLod}
          options={["100", "200", "300", "350", "400", "500"].map((x) => ({ id: x, label: x }))}
        />
        <Toggle checked={grad} onChange={setGrad} label="I graduated in the last 24 months" />
      </div>
      <div className="flex flex-wrap gap-3">
        {["revit", "navis", "acc", "dynamo"].map((c) => (
          <Chip key={c} active={chips === c} onClick={() => setChips(c)}>
            {{ revit: "Revit", navis: "Navisworks", acc: "ACC", dynamo: "Dynamo" }[c]}
          </Chip>
        ))}
        <Chip disabled>Disabled</Chip>
      </div>
      <Stepper step={2} total={5} labels={["Details", "Background", "Program", "Documents", "Review"]} />
      <Accordion
        items={[
          { q: "Do I need Revit experience to start?", a: "No. Foundations starts from the interface and builds up to a full project." },
          { q: "Are the sessions live?", a: "Yes. You work in live sessions with an instructor, on project files." },
          { q: "How does the fresh graduate discount work?", a: "Upload a certificate or transcript from the last 24 months." },
        ]}
      />
    </div>
  );
}

export function FormsDemo() {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <Input label="Full name" name="n" defaultValue="Amira Hassan" />
      <Input label="Email" name="e" type="email" error="Please enter a valid email." defaultValue="amira@" />
      <Select label="Program" options={["Revit Architecture", "Revit MEP", "Navisworks Coordination"]} />
      <Input label="Disabled" name="d" disabled />
      <FileDrop className="sm:col-span-2" label="Upload your certificate or transcript" hint="PDF, JPG or PNG up to 5 MB" />
    </div>
  );
}

export function OverlayDemo({ light }: { light?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-5">
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Open modal
      </Button>
      <Toast tone={light ? "ink" : "paper"}>Application received</Toast>
      <Modal open={open} onClose={() => setOpen(false)} title="Check if I qualify">
        <p>Two quick questions. Did you graduate in the last 24 months, and can you upload proof?</p>
        <div className="mt-6 flex gap-3">
          <Button onClick={() => setOpen(false)}>Continue</Button>
          <Button variant="link" onClick={() => setOpen(false)}>
            Not now
          </Button>
        </div>
      </Modal>
    </div>
  );
}
