"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { App, Drawer } from "antd";
import { MOBILE_ROUTES } from "@/features/mobile/shared/constants";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileQueryKey } from "@/lib/auth/mobile-query-key";
import * as LicenseApi from "../../licenses/query";
import * as TicketApi from "../../support/tickets/query";
import { CUSTOMER_TICKET_CATEGORY_OPTIONS } from "../../support/tickets/constants";
import type { CustomerTicketCategory } from "../../support/tickets/types";
import {
  MobileDrawerBody,
  MobileDrawerFooter,
  MobileDrawerSubmitButton,
  mobileDrawerStyleProps,
  useMobileDrawerChrome,
} from "@/features/mobile/shared/components/MobileDrawerChrome";
import styles from "./support.module.css";

interface CreateCustomerSupportTicketDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateCustomerSupportTicketDrawer({
  open,
  onClose,
}: CreateCustomerSupportTicketDrawerProps) {
  const { message } = App.useApp();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colorScheme } = useMobileDrawerChrome("customer");
  const [category, setCategory] = useState<CustomerTicketCategory>("OTHER");
  const [licenseId, setLicenseId] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const licensesQuery = useQuery({
    queryKey: mobileQueryKey("customer", ["licenses-for-ticket"]),
    queryFn: () => LicenseApi.listCustomerLicenses({ status: "all", page: 1, limit: 100 }),
    enabled: open,
  });

  const licenses = licensesQuery.data?.data ?? [];

  const resetForm = () => {
    setCategory("OTHER");
    setLicenseId("");
    setSubject("");
    setDescription("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    const trimmedSubject = subject.trim();
    if (!trimmedSubject) {
      message.warning("Enter a subject for your ticket.");
      return;
    }

    setSubmitting(true);
    const result = await TicketApi.safeCreateCustomerSupportTicket({
      category,
      licenseId: licenseId || null,
      subject: trimmedSubject,
      description: description.trim() || null,
    });
    setSubmitting(false);

    if (!result.success || !result.data) {
      message.error(result.error?.message ?? "Could not create ticket.");
      return;
    }

    message.success("Support ticket opened.");
    void queryClient.invalidateQueries({ queryKey: mobileQueryKey("customer", ["support-tickets"]) });
    void queryClient.invalidateQueries({ queryKey: mobileQueryKey("customer", ["home"]) });
    handleClose();
    router.push(`${MOBILE_ROUTES.customer.support}/${result.data.id}`);
  };

  return (
    <Drawer
      title="Open support ticket"
      placement="bottom"
      size="auto"
      open={open}
      onClose={handleClose}
      destroyOnHidden
      styles={mobileDrawerStyleProps(colorScheme, {
        body: {
          maxHeight: "min(62vh, 28rem)",
          overflowY: "auto",
        },
      })}
      footer={
        <MobileDrawerFooter actor="customer">
          <MobileDrawerSubmitButton
            actor="customer"
            disabled={submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? "Submitting…" : "Submit ticket"}
          </MobileDrawerSubmitButton>
        </MobileDrawerFooter>
      }
    >
      <MobileDrawerBody actor="customer">
        <p className={styles.drawerHint}>
          Describe your issue and our team will follow up. You can track status and reply here.
        </p>

      <div className={styles.formField}>
        <label className={styles.formLabel} htmlFor="customer-ticket-category">
          Category
        </label>
        <select
          id="customer-ticket-category"
          className={styles.formSelect}
          value={category}
          onChange={(e) => setCategory(e.target.value as CustomerTicketCategory)}
        >
          {CUSTOMER_TICKET_CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.formField}>
        <label className={styles.formLabel} htmlFor="customer-ticket-license">
          Related license (optional)
        </label>
        <select
          id="customer-ticket-license"
          className={styles.formSelect}
          value={licenseId}
          onChange={(e) => setLicenseId(e.target.value)}
        >
          <option value="">No specific license</option>
          {licenses.map((license) => (
            <option key={license.id} value={license.id}>
              {license.licenseCode}
              {license.plan?.name ? ` · ${license.plan.name}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.formField}>
        <label className={styles.formLabel} htmlFor="customer-ticket-subject">
          Subject
        </label>
        <input
          id="customer-ticket-subject"
          className={styles.formInput}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Brief summary of your issue"
          maxLength={300}
        />
      </div>

      <div className={styles.formField}>
        <label className={styles.formLabel} htmlFor="customer-ticket-description">
          Details
        </label>
        <textarea
          id="customer-ticket-description"
          className={styles.formTextarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What happened? Include invoice numbers or license codes if relevant."
          rows={4}
        />
      </div>
      </MobileDrawerBody>
    </Drawer>
  );
}
