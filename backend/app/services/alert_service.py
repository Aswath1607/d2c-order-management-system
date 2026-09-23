from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.alert import Alert
from app.models.product import Product


def ensure_single_alert(db: Session, product: Product, alert_type: str, severity: str, message: str, current_stock: int, threshold: int) -> None:
    existing = (
        db.query(Alert)
        .filter(Alert.product_id == product.product_id, Alert.alert_type == alert_type, Alert.resolved_at.is_(None))
        .first()
    )
    if existing:
        existing.alert_type = alert_type
        existing.severity = severity
        existing.message = message
        existing.current_stock = current_stock
        existing.threshold = threshold
        existing.is_read = False
        existing.created_at = datetime.now(timezone.utc)
        return

    alert = Alert(
        product_id=product.product_id,
        alert_type=alert_type,
        severity=severity,
        message=message,
        current_stock=current_stock,
        threshold=threshold,
        is_read=False,
        created_at=datetime.now(timezone.utc),
    )
    db.add(alert)


def evaluate_product_alerts(db: Session, product: Product, inventory) -> None:
    if inventory.available_quantity <= 0:
        ensure_single_alert(db, product, "OUT_OF_STOCK", "CRITICAL", f"{product.product_name} is out of stock.", int(inventory.available_quantity), int(inventory.reorder_level or 0))
    elif inventory.available_quantity <= inventory.reorder_level:
        ensure_single_alert(db, product, "LOW_STOCK", "WARNING", f"{product.product_name} is below reorder level.", int(inventory.available_quantity), int(inventory.reorder_level or 0))
    else:
        resolved = db.query(Alert).filter(Alert.product_id == product.product_id, Alert.resolved_at.is_(None)).all()
        for alert in resolved:
            if alert.alert_type in {"LOW_STOCK", "OUT_OF_STOCK"}:
                alert.resolved_at = datetime.now(timezone.utc)
                alert.is_read = True
