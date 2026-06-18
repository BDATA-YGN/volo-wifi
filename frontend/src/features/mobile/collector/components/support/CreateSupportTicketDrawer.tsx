"use client";

import { useEffect, useState } from "react";
import { App, Drawer } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { mobileQueryKey } from "@/lib/auth/mobile-query-key";
import {
  MobileDrawerBody,
  MobileDrawerFooter,
  MobileDrawerSubmitButton,
  mobileDrawerStyleProps,
  useMobileDrawerChrome,
} from "@/features/mobile/shared/components/MobileDrawerChrome";
import * as SupportApi from "../../support/query";
import {
  SUPPORT_CATEGORY_OPTIONS,
  SUPPORT_PRIORITY_OPTIONS,
} from "../../support/constants";
import type { SupportCustomerSearchRow } from "../../support/types";
import styles from "./support.module.css";

interface CreateSupportTicketDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateSupportTicketDrawer({ open, onClose }: CreateSupportTicketDrawerProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { colorScheme } = useMobileDrawerChrome("collector");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<SupportCustomerSearchRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<SupportCustomerSearchRow | null>(null);
  const [licenseId, setLicenseId] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [priority, setPriority] = useState("NORMAL");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setCustomerSearch("");
      setCustomers([]);
      setSelectedCustomer(null);
      setLicenseId("");
      setCategory("OTHER");
      setPriority("NORMAL");
      setSubject("");
      setDescription("");
    }
  }, [open]);

  useEffect(() => {
    if (!open || customerSearch.trim().length < 2) {
      setCustomers([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const rows = await SupportApi.searchSupportCustomers(customerSearch);
        setCustomers(rows);
      } catch {
        setCustomers([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [customerSearch, open]);

  const handleSubmit = async () => {
    if (!selectedCustomer) {
      message.warning("Select a customer.");
      return;
    }
    if (!subject.trim()) {
      message.warning("Enter a subject.");
      return;
    }

    setSubmitting(true);
    const result = await SupportApi.safeCreateCollectorSupportTicket({
      customerId: selectedCustomer.id,
      licenseId: licenseId || null,
      category: category as "OTHER",
      priority: priority as "NORMAL",
      source: "WALK_IN",
      subject: subject.trim(),
      description: description.trim() || null,
      assignToSelf: true,
    });
    setSubmitting(false);

    if (!result.success || !result.data) {
      message.error(result.error?.message ?? "Could not create ticket.");
      return;
    }

    message.success("Support ticket created.");
    void queryClient.invalidateQueries({ queryKey: mobileQueryKey("collector", ["support"]) });
    void queryClient.invalidateQueries({ queryKey: mobileQueryKey("collector", ["home"]) });
    onClose();
  };

  return (
    <Drawer
      title="New support ticket"
      placement="bottom"
      size="auto"
      open={open}
      onClose={onClose}
      destroyOnHidden
      styles={mobileDrawerStyleProps(colorScheme, {
        body: {
          maxHeight: "min(72vh, 32rem)",
          overflowY: "auto",
        },
      })}
      footer={
        <MobileDrawerFooter actor="collector">
          <MobileDrawerSubmitButton
            actor="collector"
            disabled={submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? "Creating…" : "Create ticket"}
          </MobileDrawerSubmitButton>
        </MobileDrawerFooter>
      }
    >
      <MobileDrawerBody actor="collector">
        <div className={styles.formField}>
          <label className={styles.formLabel} htmlFor="support-customer-search">
            Customer
          </label>
          <input
            id="support-customer-search"
            className={styles.formInput}
            placeholder="Search name, phone, license…"
            value={customerSearch}
            onChange={(e) => {
              setCustomerSearch(e.target.value);
              setSelectedCustomer(null);
            }}
          />
          {searching ? <span className={styles.searchingHint}>Searching…</span> : null}
          {customers.length > 0 && !selectedCustomer ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", marginTop: "0.375rem" }}>
              {customers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={styles.customerOption}
                  onClick={() => {
                    setSelectedCustomer(c);
                    setCustomerSearch(c.fullName);
                    setCustomers([]);
                    setLicenseId("");
                  }}
                >
                  <strong>{c.fullName}</strong>
                  {c.township ? ` · ${c.township}` : ""}
                </button>
              ))}
            </div>
          ) : null}
          {selectedCustomer ? (
            <span className={styles.accentHint}>Selected: {selectedCustomer.fullName}</span>
          ) : null}
        </div>

        {selectedCustomer && selectedCustomer.licenses.length > 0 ? (
          <div className={styles.formField}>
            <label className={styles.formLabel} htmlFor="support-license">
              License (optional)
            </label>
            <select
              id="support-license"
              className={styles.formSelect}
              value={licenseId}
              onChange={(e) => setLicenseId(e.target.value)}
            >
              <option value="">No specific license</option>
              {selectedCustomer.licenses.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.licenseCode}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className={styles.formField}>
          <label className={styles.formLabel} htmlFor="support-category">
            Category
          </label>
          <select
            id="support-category"
            className={styles.formSelect}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {SUPPORT_CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formField}>
          <label className={styles.formLabel} htmlFor="support-priority">
            Priority
          </label>
          <select
            id="support-priority"
            className={styles.formSelect}
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            {SUPPORT_PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formField}>
          <label className={styles.formLabel} htmlFor="support-subject">
            Subject
          </label>
          <input
            id="support-subject"
            className={styles.formInput}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief summary"
            maxLength={300}
          />
        </div>

        <div className={styles.formField}>
          <label className={styles.formLabel} htmlFor="support-description">
            Description
          </label>
          <textarea
            id="support-description"
            className={styles.formTextarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What did the customer report?"
          />
        </div>
      </MobileDrawerBody>
    </Drawer>
  );
}
