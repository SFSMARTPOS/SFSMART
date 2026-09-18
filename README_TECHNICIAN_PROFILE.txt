SF SMART POS SYSTEM — TECHNICIAN PROFILE & EFFECTIVE-MONTH COMMISSION

Added on top of the v19 My Profit Dashboard version. Existing features are preserved.

1. Temporary Accounts → Technician Profile.
2. Add technician details: Name, Phone, Join Date, Address/Note and Active/Inactive status.
3. Technician names are available in the repair Technician field.
4. Each technician row has Set Commission. Security verification is required.
5. Commission has an Effective From Month and percentage.
6. Example: January = 20%; if changed to September = 40%, January–August remain 20% and September onward uses 40% until another change.
7. A future month can be scheduled, e.g. December = 50%; earlier months remain unchanged.
8. Finished repair records store commissionRateSnapshot, so changing a technician's future/current commission never changes old completed repair profit records.
9. Commission History is displayed in the Technician Profile and Commission modal.
10. Existing Technician Commission and My Profit Dashboard calculations use the historical rate/snapshot.

Profit calculation remains:
Service Profit = Customer Charge − Item Sale Total.
Technician Commission = Service Profit × applicable Commission %.
My Service Commission = Service Profit − Technician Commission.
My Item Profit = Item Sale Total − Item Cost Total.
My Total Profit = My Item Profit + My Service Commission.
