'use client';
import Link from 'next/link';
import { FileText, ArrowLeft } from 'lucide-react';

export default function TerminosDeUsoPage() {
    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8faf5 0%, #eef2e6 100%)' }}>
            {/* Header */}
            <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 24px' }}>
                <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6a9a04', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>
                        <ArrowLeft size={18} /> Volver al inicio
                    </Link>
                </div>
            </div>

            {/* Content */}
            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 24px' }}>
                <div style={{ background: 'white', borderRadius: '20px', padding: '48px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    {/* Title */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(106,154,4,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FileText size={28} style={{ color: '#6a9a04' }} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', margin: 0 }}>Términos y Condiciones de Uso</h1>
                            <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0' }}>Portal de Distribuidores GreenLand</p>
                        </div>
                    </div>

                    <div style={{ fontSize: '15px', lineHeight: '1.8', color: '#334155' }}>
                        <p>Los presentes Términos y Condiciones de Uso regulan el acceso y utilización del Portal de Distribuidores GreenLand, propiedad de GreenLand Products S.A. de C.V., con domicilio en:</p>

                        <p style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: '12px', borderLeft: '4px solid #6a9a04', fontWeight: '500' }}>
                            BLVD. Vito Alessio Robles No. Ext. 3550 No. Int. 9<br />
                            Col. Nazario S. Ortiz Garza<br />
                            C.P. 25100 Saltillo, Coahuila de Zaragoza, México.
                        </p>

                        <p>El acceso y uso del portal implica la aceptación de los presentes términos por parte del usuario.</p>

                        {/* Section 1 */}
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '36px', paddingBottom: '10px', borderBottom: '2px solid #f1f5f9' }}>1. Objeto del portal</h2>
                        <p>El Portal de Distribuidores GreenLand es una plataforma digital diseñada para facilitar la gestión operativa entre GreenLand y sus distribuidores autorizados, permitiendo entre otras funciones:</p>
                        <ul style={{ paddingLeft: '24px' }}>
                            <li>Creación y seguimiento de pedidos</li>
                            <li>Consulta de inventarios</li>
                            <li>Registro de ventas</li>
                            <li>Gestión de pagos</li>
                            <li>Seguimiento logístico de envíos</li>
                            <li>Consulta de información comercial relacionada con la relación entre el distribuidor y GreenLand.</li>
                        </ul>

                        {/* Section 2 */}
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '36px', paddingBottom: '10px', borderBottom: '2px solid #f1f5f9' }}>2. Usuarios del portal</h2>
                        <p>El acceso al portal está exclusivamente reservado para distribuidores autorizados por GreenLand.</p>
                        <p>Para obtener acceso al portal, los usuarios deberán proporcionar información veraz y completa, incluyendo documentación que permita verificar su identidad, capacidad comercial y situación fiscal.</p>
                        <p>GreenLand se reserva el derecho de aprobar o rechazar solicitudes de acceso al portal sin necesidad de justificar su decisión.</p>

                        {/* Section 3 */}
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '36px', paddingBottom: '10px', borderBottom: '2px solid #f1f5f9' }}>3. Veracidad de la información</h2>
                        <p>El usuario se compromete a proporcionar información veraz, completa y actualizada, incluyendo:</p>
                        <ul style={{ paddingLeft: '24px' }}>
                            <li>Datos de identificación</li>
                            <li>Información fiscal</li>
                            <li>Documentación corporativa</li>
                            <li>Direcciones de envío</li>
                            <li>Información comercial necesaria para la relación de negocio.</li>
                        </ul>
                        <p>El usuario será responsable de cualquier daño o perjuicio derivado de la proporcionación de información falsa o incompleta.</p>

                        {/* Section 4 */}
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '36px', paddingBottom: '10px', borderBottom: '2px solid #f1f5f9' }}>4. Uso del portal</h2>
                        <p>El usuario se compromete a utilizar el portal únicamente para fines relacionados con la operación comercial legítima con GreenLand.</p>
                        <p>Queda prohibido:</p>
                        <ul style={{ paddingLeft: '24px' }}>
                            <li>Utilizar el portal para actividades ilícitas</li>
                            <li>Proporcionar información falsa</li>
                            <li>Intentar acceder a cuentas de otros usuarios</li>
                            <li>Alterar o manipular información del sistema</li>
                            <li>Utilizar el portal para fines distintos a los autorizados por GreenLand.</li>
                        </ul>
                        <p>GreenLand podrá suspender o cancelar el acceso de cualquier usuario que incumpla estas disposiciones.</p>

                        {/* Section 5 */}
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '36px', paddingBottom: '10px', borderBottom: '2px solid #f1f5f9' }}>5. Pedidos y operaciones comerciales</h2>
                        <p>Los pedidos registrados a través del portal constituyen solicitudes de compra o suministro, las cuales estarán sujetas a confirmación por parte de GreenLand.</p>
                        <p>GreenLand se reserva el derecho de aceptar, rechazar o modificar pedidos conforme a:</p>
                        <ul style={{ paddingLeft: '24px' }}>
                            <li>Disponibilidad de inventario</li>
                            <li>Condiciones comerciales</li>
                            <li>Acuerdos previamente establecidos con el distribuidor.</li>
                        </ul>

                        {/* Section 6 */}
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '36px', paddingBottom: '10px', borderBottom: '2px solid #f1f5f9' }}>6. Inventarios y registros de ventas</h2>
                        <p>El portal puede permitir a los distribuidores registrar:</p>
                        <ul style={{ paddingLeft: '24px' }}>
                            <li>Inventarios</li>
                            <li>Ventas</li>
                            <li>Movimientos de productos</li>
                        </ul>
                        <p>Estos registros tienen un carácter informativo y de control operativo, y no sustituyen las obligaciones fiscales o contables del usuario.</p>
                        <p>El distribuidor es responsable de la exactitud de la información registrada.</p>

                        {/* Section 7 */}
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '36px', paddingBottom: '10px', borderBottom: '2px solid #f1f5f9' }}>7. Pagos</h2>
                        <p>Los pagos registrados en el portal tienen la finalidad de facilitar la conciliación de operaciones comerciales.</p>
                        <p>GreenLand podrá requerir comprobantes de pago y realizar validaciones antes de confirmar la aplicación de los mismos.</p>

                        {/* Section 8 */}
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '36px', paddingBottom: '10px', borderBottom: '2px solid #f1f5f9' }}>8. Propiedad intelectual</h2>
                        <p>El portal, su diseño, estructura, software, contenidos, logotipos y marcas son propiedad de GreenLand Products S.A. de C.V.</p>
                        <p>Queda prohibida la reproducción, modificación o uso no autorizado de cualquier elemento del portal.</p>

                        {/* Section 9 */}
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '36px', paddingBottom: '10px', borderBottom: '2px solid #f1f5f9' }}>9. Disponibilidad del portal</h2>
                        <p>GreenLand realizará esfuerzos razonables para mantener la disponibilidad del portal, sin embargo, no garantiza que el servicio esté libre de interrupciones.</p>
                        <p>GreenLand podrá realizar actualizaciones, mejoras o mantenimientos en la plataforma en cualquier momento.</p>

                        {/* Section 10 */}
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '36px', paddingBottom: '10px', borderBottom: '2px solid #f1f5f9' }}>10. Protección de datos personales</h2>
                        <p>El tratamiento de los datos personales de los usuarios se rige por el <Link href="/aviso-de-privacidad" style={{ color: '#6a9a04', fontWeight: '600' }}>Aviso de Privacidad</Link> de GreenLand, disponible en el sitio web y en el portal.</p>

                        {/* Section 11 */}
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '36px', paddingBottom: '10px', borderBottom: '2px solid #f1f5f9' }}>11. Modificaciones</h2>
                        <p>GreenLand se reserva el derecho de modificar los presentes Términos y Condiciones en cualquier momento.</p>
                        <p>Las modificaciones serán publicadas en el portal y entrarán en vigor a partir de su publicación.</p>

                        {/* Section 12 */}
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '36px', paddingBottom: '10px', borderBottom: '2px solid #f1f5f9' }}>12. Legislación aplicable</h2>
                        <p>Los presentes Términos y Condiciones se regirán conforme a las leyes aplicables en los Estados Unidos Mexicanos.</p>
                        <p>Cualquier controversia será sometida a los tribunales competentes de Saltillo, Coahuila de Zaragoza, México.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
