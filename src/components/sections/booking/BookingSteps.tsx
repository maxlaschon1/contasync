"use client";

import { useState } from "react";
import { brandConfig } from "@/config/brand.config";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Clock,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import type { ServiceCategory, Service } from "@/types/brand";

const STEP_LABELS = ["Category", "Service", "Date & Time", "Confirm"];

const TIME_SLOTS = [
  "9:00", "9:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00",
];

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  // Convert Sunday=0 to Monday-based (Mon=0, Sun=6)
  return day === 0 ? 6 : day - 1;
}

export function BookingSteps() {
  const services = brandConfig.content.services;

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [confirmed, setConfirmed] = useState(false);

  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const monthName = new Date(viewYear, viewMonth).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  const goBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleConfirm = () => {
    setConfirmed(true);
  };

  const bookingRef = `GS-${Math.floor(1000 + Math.random() * 9000)}`;

  return (
    <section className="py-20 bg-background">
      <div className="mx-auto max-w-3xl px-4 lg:px-8">
        {/* Step indicator */}
        <div className="flex items-center justify-center mb-12">
          {STEP_LABELS.map((label, index) => (
            <div key={label} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    index <= currentStep
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {index < currentStep ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className="mt-2 text-xs text-muted-foreground max-md:hidden">
                  {label}
                </span>
              </div>
              {index < STEP_LABELS.length - 1 && (
                <div
                  className={`w-12 md:w-20 h-0.5 mx-2 ${
                    index < currentStep ? "bg-secondary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Back button */}
        {currentStep > 0 && !confirmed && (
          <Button
            variant="ghost"
            onClick={goBack}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        )}

        {/* Step 0 — Select Category */}
        {currentStep === 0 && (
          <div>
            <h2 className="font-heading text-2xl font-bold mb-6">
              Select a Treatment Category
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {services.map((category) => (
                <Card
                  key={category.slug}
                  className="cursor-pointer hover:shadow-lg transition-shadow duration-300 hover:border-secondary"
                  onClick={() => {
                    setSelectedCategory(category);
                    setCurrentStep(1);
                  }}
                >
                  <CardContent className="flex items-center justify-between">
                    <div>
                      <h3 className="font-heading text-lg font-semibold">
                        {category.name}
                      </h3>
                      {category.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {category.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {category.services.length} service
                        {category.services.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 1 — Select Service */}
        {currentStep === 1 && selectedCategory && (
          <div>
            <h2 className="font-heading text-2xl font-bold mb-6">
              Choose a Service
            </h2>
            <div className="flex flex-col gap-4">
              {selectedCategory.services.map((service) => (
                <Card
                  key={service.name}
                  className="cursor-pointer hover:shadow-lg transition-shadow duration-300 hover:border-secondary"
                  onClick={() => {
                    setSelectedService(service);
                    setCurrentStep(2);
                  }}
                >
                  <CardContent className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-heading text-base font-semibold">
                        {service.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {service.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {service.duration}
                        </span>
                        <span className="font-semibold text-foreground">
                          {service.price}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — Select Date & Time */}
        {currentStep === 2 && (
          <div>
            <h2 className="font-heading text-2xl font-bold mb-6">
              Pick a Date & Time
            </h2>

            {/* Calendar */}
            <Card className="mb-8">
              <CardContent>
                {/* Month header */}
                <div className="flex items-center justify-between mb-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (viewMonth === 0) {
                        setViewMonth(11);
                        setViewYear(viewYear - 1);
                      } else {
                        setViewMonth(viewMonth - 1);
                      }
                    }}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <h3 className="font-heading text-lg font-semibold">
                    {monthName}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (viewMonth === 11) {
                        setViewMonth(0);
                        setViewYear(viewYear + 1);
                      } else {
                        setViewMonth(viewMonth + 1);
                      }
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <div
                      key={day}
                      className="text-xs font-medium text-muted-foreground py-1"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Empty cells before first day */}
                  {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}

                  {/* Day numbers */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const date = new Date(viewYear, viewMonth, day);
                    const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    const isSelected =
                      selectedDate &&
                      selectedDate.getDate() === day &&
                      selectedDate.getMonth() === viewMonth &&
                      selectedDate.getFullYear() === viewYear;

                    return (
                      <button
                        key={day}
                        disabled={isPast}
                        onClick={() => setSelectedDate(date)}
                        className={`h-10 rounded-md text-sm transition-colors ${
                          isPast
                            ? "opacity-50 cursor-not-allowed text-muted-foreground"
                            : isSelected
                              ? "bg-secondary text-secondary-foreground font-semibold"
                              : "hover:bg-muted"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Time slots */}
            {selectedDate && (
              <div>
                <h3 className="font-heading text-lg font-semibold mb-4">
                  Available Times
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {TIME_SLOTS.map((time) => (
                    <button
                      key={time}
                      onClick={() => {
                        setSelectedTime(time);
                        setCurrentStep(3);
                      }}
                      className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                        selectedTime === time
                          ? "bg-secondary text-secondary-foreground"
                          : "bg-muted text-foreground hover:bg-muted/80"
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3 — Confirm Details */}
        {currentStep === 3 && !confirmed && (
          <div>
            <h2 className="font-heading text-2xl font-bold mb-6">
              Confirm Your Booking
            </h2>

            {/* Summary card */}
            <Card className="mb-8">
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Category</span>
                  <span className="font-medium">{selectedCategory?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service</span>
                  <span className="font-medium">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">
                    {selectedDate?.toLocaleDateString("en-GB", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium">{selectedTime}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{selectedService?.duration}</span>
                </div>
                <div className="border-t pt-3 flex justify-between text-sm">
                  <span className="font-semibold">Total</span>
                  <span className="font-semibold">{selectedService?.price}</span>
                </div>
              </CardContent>
            </Card>

            {/* Contact form */}
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <Input
                  placeholder="Your full name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <Input
                  type="tel"
                  placeholder="+44 ..."
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
            </div>

            <Button
              onClick={handleConfirm}
              className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
              size="lg"
            >
              Confirm Booking
            </Button>
          </div>
        )}

        {/* Success state */}
        {confirmed && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-6">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="font-heading text-2xl font-bold mb-2">
              Booking Confirmed!
            </h2>
            <p className="text-muted-foreground mb-2">
              Your booking reference is{" "}
              <span className="font-semibold text-foreground">
                {bookingRef}
              </span>
            </p>
            <p className="text-muted-foreground mb-8">
              A confirmation email has been sent to{" "}
              <span className="font-medium text-foreground">
                {formData.email}
              </span>
            </p>
            <Button asChild className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
              <a href="/">Back to Home</a>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
